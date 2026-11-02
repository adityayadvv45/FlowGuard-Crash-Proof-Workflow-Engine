package com.flowguard.engine;

import com.flowguard.dto.CreateWorkflowRequest;
import com.flowguard.dto.ExecutionResponse;
import com.flowguard.dto.StartExecutionRequest;
import com.flowguard.dto.WorkflowDefinitionResponse;
import com.flowguard.entity.StepExecution;
import com.flowguard.enums.StepStatus;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import com.flowguard.service.FailureSimulationService;
import com.flowguard.service.RecoveryService;
import com.flowguard.service.WorkflowDefinitionService;
import com.flowguard.service.WorkflowExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class WorkflowEngineIntegrationTest {

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

    @Autowired
    private FailureSimulationService failureSimulationService;

    private UUID workflowDefinitionId;

    @BeforeEach
    void setUp() {
        CreateWorkflowRequest request = new CreateWorkflowRequest(
                "E-Commerce Order Test Flow",
                "Sequential order processing pipeline",
                List.of(
                        new CreateWorkflowRequest.StepDefinitionDto("VALIDATE_ORDER", "Validate Order", 1, null),
                        new CreateWorkflowRequest.StepDefinitionDto("PROCESS_PAYMENT", "Process Payment", 2, null),
                        new CreateWorkflowRequest.StepDefinitionDto("UPDATE_INVENTORY", "Update Inventory", 3, null),
                        new CreateWorkflowRequest.StepDefinitionDto("SEND_NOTIFICATION", "Send Notification", 4, null)
                )
        );
        WorkflowDefinitionResponse def = definitionService.createDefinition(request);
        workflowDefinitionId = def.id();
    }

    @Test
    @DisplayName("1. Successful sequential execution of all 4 steps")
    void shouldExecuteAllStepsSequentiallyToCompletion() {
        Map<String, Object> input = Map.of("orderId", "ORD-101", "amount", 149.99, "customerId", "CUST-9");
        ExecutionResponse response = executionService.startExecution(workflowDefinitionId, new StartExecutionRequest(input, null, null, null), null);

        // Run synchronously to completion
        workflowEngine.processWorkflow(response.id());

        ExecutionResponse result = executionService.getExecution(response.id());
        assertEquals(WorkflowStatus.COMPLETED, result.status());
        assertNotNull(result.completedAt());
        assertEquals(4, result.steps().size());

        for (var step : result.steps()) {
            assertEquals(StepStatus.COMPLETED, step.status(), "Step " + step.stepName() + " should be COMPLETED");
            assertNotNull(step.outputJson(), "Step " + step.stepName() + " output should be persisted");
            assertTrue(step.attemptCount() >= 1);
        }
    }

    @Test
    @DisplayName("2. Permanent failure handling: invalid order amount fails step 1 immediately without retry")
    void shouldHandlePermanentFailureImmediately() {
        Map<String, Object> input = Map.of("orderId", "ORD-BAD", "amount", -50.0);
        ExecutionResponse response = executionService.startExecution(workflowDefinitionId, new StartExecutionRequest(input, null, null, null), null);

        workflowEngine.processWorkflow(response.id());

        ExecutionResponse result = executionService.getExecution(response.id());
        assertEquals(WorkflowStatus.FAILED, result.status());

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(response.id());
        assertEquals(StepStatus.FAILED, steps.get(0).getStatus());
        assertEquals(StepStatus.PENDING, steps.get(1).getStatus()); // Subsequent steps never run
    }

    @Test
    @DisplayName("3. Transient failure enters RETRY_WAIT and recovers on subsequent attempt")
    void shouldRetryTransientFailureAndComplete() {
        Map<String, Object> input = Map.of("orderId", "ORD-RETRY", "amount", 99.0, "simulateTransientPaymentFailure", true);
        ExecutionResponse response = executionService.startExecution(workflowDefinitionId, new StartExecutionRequest(input, null, null, null), null);

        // First run triggers transient error on step 2
        workflowEngine.processWorkflow(response.id());

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(response.id());
        assertEquals(StepStatus.COMPLETED, steps.get(0).getStatus()); // Step 1 completed
        assertEquals(StepStatus.RETRY_WAIT, steps.get(1).getStatus()); // Step 2 in RETRY_WAIT
        assertNotNull(steps.get(1).getNextRetryAt());

        // Fast-forward retry timer by updating nextRetryAt to past
        StepExecution step2 = steps.get(1);
        step2.setNextRetryAt(OffsetDateTime.now().minusSeconds(1));
        stepRepository.save(step2);

        // Run retry dispatcher synchronously
        recoveryService.pollAndDispatchRetries(false);
        workflowEngine.processWorkflow(response.id());

        ExecutionResponse finalResult = executionService.getExecution(response.id());
        assertEquals(WorkflowStatus.COMPLETED, finalResult.status());
    }

    @Test
    @DisplayName("4. Crash Recovery: Preserves completed steps and resumes interrupted execution without restarting from beginning")
    void shouldRecoverInterruptedExecutionWithoutReExecutingCompletedSteps() {
        Map<String, Object> input = Map.of("orderId", "ORD-CRASH-TEST", "amount", 250.0);
        ExecutionResponse response = executionService.startExecution(workflowDefinitionId, new StartExecutionRequest(input, null, null, null), null);

        // Register simulated worker crash during step 3 (UPDATE_INVENTORY)
        failureSimulationService.registerRule(response.id(), "UPDATE_INVENTORY", "CRASH");

        // Execute workflow — will crash during step 3!
        workflowEngine.processWorkflow(response.id());

        List<StepExecution> stepsAfterCrash = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(response.id());
        assertEquals(StepStatus.COMPLETED, stepsAfterCrash.get(0).getStatus(), "Step 1 must be completed");
        assertEquals(StepStatus.COMPLETED, stepsAfterCrash.get(1).getStatus(), "Step 2 must be completed");
        assertEquals(StepStatus.RUNNING, stepsAfterCrash.get(2).getStatus(), "Step 3 was interrupted with active lease");
        assertEquals(StepStatus.PENDING, stepsAfterCrash.get(3).getStatus(), "Step 4 is pending");

        int step1Attempts = stepsAfterCrash.get(0).getAttemptCount();
        int step2Attempts = stepsAfterCrash.get(1).getAttemptCount();

        // Simulate lease expiration (as if time passed or process crashed)
        StepExecution step3 = stepsAfterCrash.get(2);
        step3.setWorkerLeaseUntil(OffsetDateTime.now().minusSeconds(5));
        stepRepository.save(step3);

        // Trigger crash recovery reclaimer synchronously without async race
        recoveryService.recoverInterruptedExecutions(false);

        // Process resumed workflow
        workflowEngine.processWorkflow(response.id());

        // Verify final state
        ExecutionResponse recoveredResult = executionService.getExecution(response.id());
        assertEquals(WorkflowStatus.COMPLETED, recoveredResult.status(), "Workflow should successfully complete after recovery");

        List<StepExecution> finalSteps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(response.id());
        assertEquals(StepStatus.COMPLETED, finalSteps.get(0).getStatus());
        assertEquals(StepStatus.COMPLETED, finalSteps.get(1).getStatus());
        assertEquals(StepStatus.COMPLETED, finalSteps.get(2).getStatus());
        assertEquals(StepStatus.COMPLETED, finalSteps.get(3).getStatus());

        // CRITICAL CHECK: Verify steps 1 and 2 were NOT re-executed!
        assertEquals(step1Attempts, finalSteps.get(0).getAttemptCount(), "Step 1 attempt count must remain unchanged!");
        assertEquals(step2Attempts, finalSteps.get(1).getAttemptCount(), "Step 2 attempt count must remain unchanged!");
    }

    @Test
    @DisplayName("5. Cancellation: Cancelling an execution stops further processing")
    void shouldCancelActiveExecution() {
        Map<String, Object> input = Map.of("orderId", "ORD-CANCEL", "amount", 50.0);
        ExecutionResponse response = executionService.startExecution(workflowDefinitionId, new StartExecutionRequest(input, null, null, null), null);

        executionService.cancelExecution(response.id());

        ExecutionResponse cancelled = executionService.getExecution(response.id());
        assertEquals(WorkflowStatus.CANCELLED, cancelled.status());
    }
}
