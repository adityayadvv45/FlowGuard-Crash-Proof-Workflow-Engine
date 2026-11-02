package com.flowguard.service;

import com.flowguard.engine.WorkflowEngine;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.EventType;
import com.flowguard.enums.StepStatus;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Executor;

@Service
public class RecoveryService {

    private static final Logger log = LoggerFactory.getLogger(RecoveryService.class);

    private final StepExecutionRepository stepRepository;
    private final WorkflowExecutionRepository executionRepository;
    private final WorkflowEngine workflowEngine;
    private final ExecutionEventRecorder eventRecorder;
    private final Executor workerExecutor;

    public RecoveryService(
            StepExecutionRepository stepRepository,
            WorkflowExecutionRepository executionRepository,
            WorkflowEngine workflowEngine,
            ExecutionEventRecorder eventRecorder,
            @Qualifier("workflowWorkerExecutor") Executor workerExecutor
    ) {
        this.stepRepository = stepRepository;
        this.executionRepository = executionRepository;
        this.workflowEngine = workflowEngine;
        this.eventRecorder = eventRecorder;
        this.workerExecutor = workerExecutor;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        log.info("[RECOVERY] Application started — initiating crash recovery inspection...");
        recoverInterruptedExecutions();
    }

    @Scheduled(fixedDelayString = "${flowguard.engine.recovery-interval-seconds:10}000", initialDelay = 5000)
    public void scheduledRecoverySweep() {
        recoverInterruptedExecutions();
    }

    @Scheduled(fixedDelayString = "${flowguard.engine.retry-poll-interval-seconds:2}000", initialDelay = 2000)
    public void scheduledRetrySweep() {
        pollAndDispatchRetries();
    }

    @Transactional
    public synchronized Set<UUID> recoverInterruptedExecutions() {
        return recoverInterruptedExecutions(true);
    }

    @Transactional
    public synchronized Set<UUID> recoverInterruptedExecutions(boolean asyncDispatch) {
        OffsetDateTime now = OffsetDateTime.now();
        List<StepExecution> expiredLeases = stepRepository.findExpiredLeases(now);

        Set<UUID> workflowsToResume = new HashSet<>();

        for (StepExecution step : expiredLeases) {
            log.warn("[RECOVERY] Found interrupted step '{}' (id={}) with expired lease (expired at {}). Resetting for recovery.",
                    step.getStepName(), step.getId(), step.getWorkerLeaseUntil());

            step.setStatus(StepStatus.PENDING);
            step.setWorkerLeaseOwner(null);
            step.setWorkerLeaseUntil(null);
            stepRepository.save(step);

            eventRecorder.recordEvent(
                    step.getWorkflowExecutionId(),
                    step.getId(),
                    EventType.RECOVERY_PERFORMED,
                    "Crash recovery: Reclaimed expired worker lease for step '" + step.getStepName() + "'. Resuming safely without repeating completed steps.",
                    "{\"previousLeaseUntil\":\"" + step.getWorkerLeaseUntil() + "\"}"
            );

            workflowsToResume.add(step.getWorkflowExecutionId());
        }

        // Also check if there are any pending/running workflows with unstarted steps
        List<WorkflowExecution> activeExecutions = executionRepository.findIncompleteExecutions();
        for (WorkflowExecution exec : activeExecutions) {
            workflowsToResume.add(exec.getId());
        }

        if (asyncDispatch) {
            for (UUID workflowId : workflowsToResume) {
                log.info("[RECOVERY] Dispatching recovered workflow {} to worker pool", workflowId);
                workerExecutor.execute(() -> {
                    try {
                        workflowEngine.processWorkflow(workflowId);
                    } catch (Exception e) {
                        log.error("[RECOVERY] Error processing recovered workflow {}: {}", workflowId, e.getMessage(), e);
                    }
                });
            }
        }
        return workflowsToResume;
    }

    @Transactional
    public synchronized Set<UUID> pollAndDispatchRetries() {
        return pollAndDispatchRetries(true);
    }

    @Transactional
    public synchronized Set<UUID> pollAndDispatchRetries(boolean asyncDispatch) {
        OffsetDateTime now = OffsetDateTime.now();
        List<StepExecution> retryReadySteps = stepRepository.findStepsReadyForRetry(now);

        Set<UUID> workflowsToTrigger = new HashSet<>();
        for (StepExecution step : retryReadySteps) {
            log.info("[RETRY-DISPATCHER] Step '{}' retry timer reached ({}). Resetting to PENDING.",
                    step.getStepName(), step.getNextRetryAt());

            step.setStatus(StepStatus.PENDING);
            step.setNextRetryAt(null);
            stepRepository.save(step);

            workflowsToTrigger.add(step.getWorkflowExecutionId());
        }

        if (asyncDispatch) {
            for (UUID workflowId : workflowsToTrigger) {
                workerExecutor.execute(() -> {
                    try {
                        workflowEngine.processWorkflow(workflowId);
                    } catch (Exception e) {
                        log.error("[RETRY-DISPATCHER] Error resuming workflow {}: {}", workflowId, e.getMessage(), e);
                    }
                });
            }
        }
        return workflowsToTrigger;
    }
}
