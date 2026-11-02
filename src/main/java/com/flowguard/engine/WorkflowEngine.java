package com.flowguard.engine;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.entity.ExecutionEvent;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.EventType;
import com.flowguard.enums.StepStatus;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.exception.PermanentStepException;
import com.flowguard.exception.SimulatedCrashException;
import com.flowguard.exception.TransientStepException;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import com.flowguard.service.ExecutionEventRecorder;
import com.flowguard.service.FailureSimulationService;
import com.flowguard.service.RetryService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;

@Component
public class WorkflowEngine {

    private static final Logger log = LoggerFactory.getLogger(WorkflowEngine.class);

    private final String workerId;
    private final long leaseDurationSeconds;
    private final StepRegistry stepRegistry;
    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepRepository;
    private final ExecutionEventRecorder eventRecorder;
    private final RetryService retryService;
    private final FailureSimulationService failureSimulationService;
    private final ObjectMapper objectMapper;

    public WorkflowEngine(
            @Value("${flowguard.engine.worker-id:flowguard-worker-1}") String workerId,
            @Value("${flowguard.engine.lease-duration-seconds:25}") long leaseDurationSeconds,
            StepRegistry stepRegistry,
            WorkflowExecutionRepository executionRepository,
            StepExecutionRepository stepRepository,
            ExecutionEventRecorder eventRecorder,
            RetryService retryService,
            FailureSimulationService failureSimulationService,
            ObjectMapper objectMapper
    ) {
        this.workerId = workerId;
        this.leaseDurationSeconds = leaseDurationSeconds;
        this.stepRegistry = stepRegistry;
        this.executionRepository = executionRepository;
        this.stepRepository = stepRepository;
        this.eventRecorder = eventRecorder;
        this.retryService = retryService;
        this.failureSimulationService = failureSimulationService;
        this.objectMapper = objectMapper;
    }

    public void processWorkflow(UUID workflowExecutionId) {
        log.info("[ENGINE] Starting processing for workflowExecutionId={}", workflowExecutionId);

        // Verify execution exists and is runnable
        WorkflowExecution execution = executionRepository.findById(workflowExecutionId).orElse(null);
        if (execution == null || execution.getStatus().isTerminal()) {
            log.info("[ENGINE] Execution {} is absent or already terminal ({})", workflowExecutionId, execution != null ? execution.getStatus() : "null");
            return;
        }

        if (execution.getStatus() == WorkflowStatus.PENDING) {
            markWorkflowRunning(execution);
        }

        // Sequential loop through steps
        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(workflowExecutionId);
        Map<String, Object> accumulatedOutputs = new HashMap<>();

        // Populate already completed step outputs to preserve previous state
        for (StepExecution step : steps) {
            if (step.getStatus() == StepStatus.COMPLETED && step.getOutputJson() != null) {
                accumulatedOutputs.putAll(parseJsonMap(step.getOutputJson()));
            }
        }

        for (StepExecution step : steps) {
            // Re-check workflow status in case of cancellation
            WorkflowExecution currentExec = executionRepository.findById(workflowExecutionId).orElse(null);
            if (currentExec != null && currentExec.getStatus() == WorkflowStatus.CANCELLED) {
                log.info("[ENGINE] Workflow {} cancelled, stopping step processing", workflowExecutionId);
                return;
            }

            // If step is already completed, skip it (Preserve completed work!)
            if (step.getStatus() == StepStatus.COMPLETED) {
                log.info("[ENGINE] Step '{}' already COMPLETED, safely skipping", step.getStepName());
                continue;
            }

            // If step is waiting for retry and time hasn't arrived, pause sequential execution
            if (step.getStatus() == StepStatus.RETRY_WAIT) {
                if (step.getNextRetryAt() != null && step.getNextRetryAt().isAfter(OffsetDateTime.now())) {
                    log.info("[ENGINE] Step '{}' is in RETRY_WAIT until {}, halting sequential loop", step.getStepName(), step.getNextRetryAt());
                    return;
                }
            }

            // Attempt atomic claim
            boolean claimed = claimStep(step.getId());
            if (!claimed) {
                log.warn("[ENGINE] Failed to claim step {} (may be claimed by another worker or in terminal state)", step.getId());
                return;
            }

            // Reload fresh step record after claim
            StepExecution claimedStep = stepRepository.findById(step.getId()).orElseThrow();
            eventRecorder.recordEvent(
                    workflowExecutionId,
                    claimedStep.getId(),
                    EventType.STEP_STARTED,
                    "Step '" + claimedStep.getStepName() + "' started by worker " + workerId + " (attempt " + claimedStep.getAttemptCount() + ")",
                    null
            );

            // Execute step business logic
            StepResult result = executeStepLogic(claimedStep, execution.getInputJson(), accumulatedOutputs);

            if (result == null) {
                // Simulated crash occurred! Worker aborts abruptly to allow recovery demonstration
                log.warn("[ENGINE] Simulated worker crash occurred on step {}. Exiting without state commit.", claimedStep.getStepKey());
                eventRecorder.recordEvent(
                        workflowExecutionId,
                        claimedStep.getId(),
                        EventType.EXECUTION_INTERRUPTED,
                        "Worker interrupted during step '" + claimedStep.getStepName() + "'. Lease will expire at " + claimedStep.getWorkerLeaseUntil(),
                        null
                );
                return;
            }

            if (result.success()) {
                accumulatedOutputs.putAll(result.outputData());
                commitStepSuccess(claimedStep.getId(), result.outputData());
            } else {
                handleStepFailure(claimedStep, result);
                return; // Stop workflow progress on failure/retry
            }
        }

        // Check if all steps are completed
        List<StepExecution> finalSteps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(workflowExecutionId);
        boolean allComplete = finalSteps.stream().allMatch(s -> s.getStatus() == StepStatus.COMPLETED);
        if (allComplete) {
            completeWorkflow(workflowExecutionId, accumulatedOutputs);
        }
    }

    @Transactional
    public void markWorkflowRunning(WorkflowExecution execution) {
        execution.setStatus(WorkflowStatus.RUNNING);
        execution.setStartedAt(OffsetDateTime.now());
        executionRepository.save(execution);
        eventRecorder.recordEvent(
                execution.getId(),
                null,
                EventType.EXECUTION_STARTED,
                "Workflow execution started",
                null
        );
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public boolean claimStep(UUID stepId) {
        OffsetDateTime now = OffsetDateTime.now();
        OffsetDateTime leaseUntil = now.plusSeconds(leaseDurationSeconds);
        int rows = stepRepository.claimStep(stepId, StepStatus.RUNNING, workerId, leaseUntil, now);
        return rows > 0;
    }

    private StepResult executeStepLogic(StepExecution step, String workflowInputJson, Map<String, Object> previousStepOutputs) {
        try {
            // Check for simulated failure injection first
            failureSimulationService.checkAndApplySimulation(
                    step.getWorkflowExecutionId(),
                    step.getStepKey(),
                    step.getAttemptCount()
            );

            WorkflowStep workflowStep = stepRegistry.getStep(step.getStepKey())
                    .orElseThrow(() -> new PermanentStepException("No step registered for key: " + step.getStepKey()));

            Map<String, Object> workflowInput = parseJsonMap(workflowInputJson);
            StepExecutionContext context = new StepExecutionContext(
                    step.getWorkflowExecutionId(),
                    step.getId(),
                    step.getStepKey(),
                    step.getAttemptCount(),
                    workflowInput,
                    previousStepOutputs
            );

            return workflowStep.execute(context);
        } catch (SimulatedCrashException e) {
            // Return null to signify deliberate worker crash without committing DB changes
            return null;
        } catch (TransientStepException e) {
            return StepResult.retryableFailure(e.getMessage());
        } catch (PermanentStepException e) {
            return StepResult.permanentFailure(e.getMessage());
        } catch (Exception e) {
            log.error("[ENGINE] Unhandled exception in step {}: {}", step.getStepKey(), e.getMessage(), e);
            return StepResult.retryableFailure("Unexpected error: " + e.getMessage());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void commitStepSuccess(UUID stepId, Map<String, Object> output) {
        StepExecution step = stepRepository.findById(stepId).orElseThrow();
        step.setStatus(StepStatus.COMPLETED);
        step.setCompletedAt(OffsetDateTime.now());
        step.setOutputJson(toJson(output));
        step.setErrorMessage(null);
        step.setNextRetryAt(null);
        step.setWorkerLeaseOwner(null);
        step.setWorkerLeaseUntil(null);
        stepRepository.save(step);

        eventRecorder.recordEvent(
                step.getWorkflowExecutionId(),
                step.getId(),
                EventType.STEP_COMPLETED,
                "Step '" + step.getStepName() + "' completed successfully",
                toJson(output)
        );
        log.info("[ENGINE] Step '{}' successfully committed as COMPLETED", step.getStepName());
    }

    private void handleStepFailure(StepExecution step, StepResult result) {
        if (result.retryable() && retryService.canRetry(step.getAttemptCount())) {
            retryService.scheduleRetry(step, result.errorMessage());
        } else {
            failStepPermanently(step.getId(), result.errorMessage(), !result.retryable());
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void failStepPermanently(UUID stepId, String errorMessage, boolean isPermanentType) {
        StepExecution step = stepRepository.findById(stepId).orElseThrow();
        step.setStatus(StepStatus.FAILED);
        step.setCompletedAt(OffsetDateTime.now());
        step.setErrorMessage(errorMessage);
        step.setWorkerLeaseOwner(null);
        step.setWorkerLeaseUntil(null);
        stepRepository.save(step);

        String reason = isPermanentType ? "Permanent validation or business failure" : "Retry limit exhausted";
        eventRecorder.recordEvent(
                step.getWorkflowExecutionId(),
                step.getId(),
                EventType.STEP_FAILED,
                "Step '" + step.getStepName() + "' failed: " + errorMessage + " (" + reason + ")",
                null
        );

        // Mark workflow as failed
        WorkflowExecution execution = executionRepository.findById(step.getWorkflowExecutionId()).orElseThrow();
        execution.setStatus(WorkflowStatus.FAILED);
        execution.setCompletedAt(OffsetDateTime.now());
        execution.setErrorMessage("Failed at step '" + step.getStepName() + "': " + errorMessage);
        executionRepository.save(execution);

        eventRecorder.recordEvent(
                execution.getId(),
                step.getId(),
                EventType.EXECUTION_FAILED,
                "Workflow execution marked as FAILED due to step '" + step.getStepName() + "' failure",
                null
        );
        log.error("[ENGINE] Workflow {} marked FAILED: {}", execution.getId(), errorMessage);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void completeWorkflow(UUID workflowExecutionId, Map<String, Object> output) {
        WorkflowExecution execution = executionRepository.findById(workflowExecutionId).orElseThrow();
        execution.setStatus(WorkflowStatus.COMPLETED);
        execution.setCompletedAt(OffsetDateTime.now());
        execution.setOutputJson(toJson(output));
        executionRepository.save(execution);

        eventRecorder.recordEvent(
                workflowExecutionId,
                null,
                EventType.EXECUTION_COMPLETED,
                "Workflow execution completed successfully with all steps",
                toJson(output)
        );
        log.info("[ENGINE] Workflow execution {} COMPLETED successfully", workflowExecutionId);
    }

    private Map<String, Object> parseJsonMap(String json) {
        if (json == null || json.isBlank()) return new HashMap<>();
        try {
            return objectMapper.readValue(json, new TypeReference<Map<String, Object>>() {});
        } catch (Exception e) {
            return new HashMap<>();
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
