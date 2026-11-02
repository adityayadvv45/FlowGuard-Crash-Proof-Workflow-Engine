package com.flowguard.engine;

import com.flowguard.dto.CreateWorkflowRequest;
import com.flowguard.dto.ExecutionResponse;
import com.flowguard.dto.StartExecutionRequest;
import com.flowguard.dto.WorkflowDefinitionResponse;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.StepStatus;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import com.flowguard.service.RecoveryService;
import com.flowguard.service.WorkflowDefinitionService;
import com.flowguard.service.WorkflowExecutionService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * PostgreSQL Integration Test using Testcontainers.
 * Validates real PostgreSQL database behavior including atomic conditional updates,
 * concurrent worker contention, lease expiry recovery, and idempotency guarantees.
 */
@SpringBootTest
@Testcontainers
class WorkflowEnginePostgresIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine")
            .withDatabaseName("flowguard_test")
            .withUsername("flowguard_test")
            .withPassword("flowguard_test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        registry.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
        registry.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        registry.add("spring.flyway.enabled", () -> "true");
        registry.add("flowguard.engine.worker-id", () -> "tc-worker-node-1");
        registry.add("flowguard.engine.lease-duration-seconds", () -> "2");
        registry.add("flowguard.engine.recovery-interval-seconds", () -> "1");
        registry.add("flowguard.engine.allow-failure-injection", () -> "true");
    }

    @Autowired
    private WorkflowDefinitionService definitionService;

    @Autowired
    private WorkflowExecutionService executionService;

    @Autowired
    private WorkflowEngine workflowEngine;

    @Autowired
    private RecoveryService recoveryService;

    @Autowired
    private StepExecutionRepository stepRepository;

    @Autowired
    private WorkflowExecutionRepository executionRepository;

    private WorkflowDefinitionResponse createTestWorkflow() {
        CreateWorkflowRequest request = new CreateWorkflowRequest(
                "PostgreSQL Concurrency Test Pipeline",
                "Verifies atomic claims and recovery on actual PostgreSQL",
                List.of(
                        new CreateWorkflowRequest.StepDefinitionDto("VALIDATE_ORDER", "Validate Order", 1, null),
                        new CreateWorkflowRequest.StepDefinitionDto("PROCESS_PAYMENT", "Process Payment", 2, null),
                        new CreateWorkflowRequest.StepDefinitionDto("UPDATE_INVENTORY", "Update Inventory", 3, null),
                        new CreateWorkflowRequest.StepDefinitionDto("SEND_NOTIFICATION", "Send Notification", 4, null)
                )
        );
        return definitionService.createDefinition(request);
    }

    @Test
    @DisplayName("Atomic Step Claiming: exactly one worker succeeds under high concurrent contention")
    void shouldEnsureExactlyOneWorkerClaimsStepUnderContention() throws InterruptedException {
        WorkflowDefinitionResponse def = createTestWorkflow();
        ExecutionResponse exec = executionService.startExecution(def.id(),
                new StartExecutionRequest(Map.of("orderId", "PG-CONC-1", "amount", 88.0), null, null, null), null);

        StepExecution firstStep = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(exec.id()).get(0);
        UUID stepId = firstStep.getId();

        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);
        CountDownLatch doneLatch = new CountDownLatch(threadCount);
        AtomicInteger successfulClaims = new AtomicInteger(0);
        List<String> claimedWorkerIds = new CopyOnWriteArrayList<>();

        OffsetDateTime leaseExpiresAt = OffsetDateTime.now().plusSeconds(30);

        for (int i = 0; i < threadCount; i++) {
            final String workerId = "concurrent-worker-" + i;
            executor.submit(() -> {
                try {
                    startLatch.await();
                    int updated = stepRepository.claimStep(stepId, workerId, leaseExpiresAt, OffsetDateTime.now());
                    if (updated == 1) {
                        successfulClaims.incrementAndGet();
                        claimedWorkerIds.add(workerId);
                    }
                } catch (Exception e) {
                    // Ignore concurrency exceptions in test worker
                } finally {
                    doneLatch.countDown();
                }
            });
        }

        // Fire all worker threads at the exact same instant
        startLatch.countDown();
        boolean completed = doneLatch.await(5, TimeUnit.SECONDS);
        executor.shutdown();

        assertTrue(completed, "All threads should complete claim attempts within 5 seconds");
        assertEquals(1, successfulClaims.get(), "Exactly one worker must succeed in claiming the atomic step");
        assertEquals(1, claimedWorkerIds.size());

        // Verify database state matches the winning worker
        StepExecution updatedStep = stepRepository.findById(stepId).orElseThrow();
        assertEquals(StepStatus.RUNNING, updatedStep.getStatus());
        assertEquals(claimedWorkerIds.get(0), updatedStep.getLockedBy());
    }

    @Test
    @DisplayName("Lease Expiration and Recovery: expired RUNNING step is reclaimed and completed")
    void shouldRecoverAndCompleteStepWithExpiredLease() {
        WorkflowDefinitionResponse def = createTestWorkflow();
        ExecutionResponse exec = executionService.startExecution(def.id(),
                new StartExecutionRequest(Map.of("orderId", "PG-RECOVER-1", "amount", 120.0), null, null, null), null);

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(exec.id());
        StepExecution firstStep = steps.get(0);

        // Manually simulate a crashed worker holding an expired lease in RUNNING status
        firstStep.setStatus(StepStatus.RUNNING);
        firstStep.setLockedBy("dead-worker-pid-999");
        firstStep.setLeaseExpiresAt(OffsetDateTime.now().minusSeconds(10));
        stepRepository.save(firstStep);

        WorkflowExecution we = executionRepository.findById(exec.id()).orElseThrow();
        we.setStatus(WorkflowStatus.RUNNING);
        executionRepository.save(we);

        // Run recovery sweep
        recoveryService.recoverStaleSteps();

        // The step should now be reset to PENDING or RETRY_WAIT and unlocked
        StepExecution recoveredStep = stepRepository.findById(firstStep.getId()).orElseThrow();
        assertNull(recoveredStep.getLockedBy(), "Locked worker ID should be cleared after recovery");
        assertTrue(recoveredStep.getStatus() == StepStatus.PENDING || recoveredStep.getStatus() == StepStatus.RETRY_WAIT,
                "Status should be reset to PENDING or RETRY_WAIT for retry");

        // Engine can now process the workflow to completion
        workflowEngine.processWorkflow(exec.id());

        WorkflowExecution completedWe = executionRepository.findById(exec.id()).orElseThrow();
        assertEquals(WorkflowStatus.COMPLETED, completedWe.getStatus());
    }

    @Test
    @DisplayName("Idempotency: duplicate request with same key returns existing execution")
    void shouldEnforceIdempotencyAndPreventDuplicateWorkflows() {
        WorkflowDefinitionResponse def = createTestWorkflow();
        String idempotencyKey = "order-idemp-key-" + UUID.randomUUID();

        StartExecutionRequest req = new StartExecutionRequest(
                Map.of("orderId", "ORD-IDEMP-99", "amount", 250.0),
                null,
                null,
                null
        );

        ExecutionResponse firstResp = executionService.startExecution(def.id(), req, idempotencyKey);
        assertNotNull(firstResp);

        // Second call with same idempotency key
        ExecutionResponse secondResp = executionService.startExecution(def.id(), req, idempotencyKey);
        assertNotNull(secondResp);

        assertEquals(firstResp.id(), secondResp.id(), "Both requests must return the same workflow execution ID");

        // Verify database contains only 1 record for this idempotency key
        long count = executionRepository.findAll().stream()
                .filter(e -> idempotencyKey.equals(e.getIdempotencyKey()))
                .count();
        assertEquals(1, count, "Only one execution row must exist for the unique idempotency key");
    }

    @Test
    @DisplayName("Non-blocking Retry Scheduling: step transitions to RETRY_WAIT with future nextRetryAt")
    void shouldTransitionToRetryWaitWithFutureTimestampOnFailure() {
        WorkflowDefinitionResponse def = createTestWorkflow();
        ExecutionResponse exec = executionService.startExecution(def.id(),
                new StartExecutionRequest(
                        Map.of("orderId", "ORD-RETRY-FAIL", "amount", 50.0),
                        null,
                        null,
                        "PROCESS_PAYMENT" // Inject failure on payment step
                ), null);

        workflowEngine.processWorkflow(exec.id());

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(exec.id());
        StepExecution paymentStep = steps.stream()
                .filter(s -> "PROCESS_PAYMENT".equals(s.getStepKey()))
                .findFirst()
                .orElseThrow();

        // Should be in RETRY_WAIT with an attempt recorded and a scheduled nextRetryAt in the future
        assertEquals(StepStatus.RETRY_WAIT, paymentStep.getStatus());
        assertTrue(paymentStep.getAttempt() >= 1);
        assertNotNull(paymentStep.getNextRetryAt(), "nextRetryAt timestamp must be scheduled");
        assertTrue(paymentStep.getNextRetryAt().isAfter(OffsetDateTime.now().minusSeconds(1)),
                "nextRetryAt must be in the future or current retry window");
    }
}
