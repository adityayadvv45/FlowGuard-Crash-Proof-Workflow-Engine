package com.flowguard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.dto.*;
import com.flowguard.engine.WorkflowEngine;
import com.flowguard.entity.*;
import com.flowguard.enums.EventType;
import com.flowguard.enums.StepStatus;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.exception.WorkflowException;
import com.flowguard.repository.ExecutionEventRepository;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.Executor;
import java.util.stream.Collectors;

@Service
public class WorkflowExecutionService {

    private static final Logger log = LoggerFactory.getLogger(WorkflowExecutionService.class);

    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepRepository;
    private final ExecutionEventRepository eventRepository;
    private final WorkflowDefinitionService definitionService;
    private final IdempotencyService idempotencyService;
    private final FailureSimulationService failureSimulationService;
    private final ExecutionEventRecorder eventRecorder;
    private final WorkflowEngine workflowEngine;
    private final Executor workerExecutor;
    private final ObjectMapper objectMapper;

    public WorkflowExecutionService(
            WorkflowExecutionRepository executionRepository,
            StepExecutionRepository stepRepository,
            ExecutionEventRepository eventRepository,
            WorkflowDefinitionService definitionService,
            IdempotencyService idempotencyService,
            FailureSimulationService failureSimulationService,
            ExecutionEventRecorder eventRecorder,
            WorkflowEngine workflowEngine,
            @Qualifier("workflowWorkerExecutor") Executor workerExecutor,
            ObjectMapper objectMapper
    ) {
        this.executionRepository = executionRepository;
        this.stepRepository = stepRepository;
        this.eventRepository = eventRepository;
        this.definitionService = definitionService;
        this.idempotencyService = idempotencyService;
        this.failureSimulationService = failureSimulationService;
        this.eventRecorder = eventRecorder;
        this.workflowEngine = workflowEngine;
        this.workerExecutor = workerExecutor;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ExecutionResponse startExecution(UUID workflowDefinitionId, StartExecutionRequest request, String idempotencyHeader) {
        String effectiveIdempotencyKey = (idempotencyHeader != null && !idempotencyHeader.isBlank())
                ? idempotencyHeader.trim()
                : (request != null && request.idempotencyKey() != null ? request.idempotencyKey().trim() : null);

        Map<String, Object> inputData = request != null && request.inputData() != null ? request.inputData() : Collections.emptyMap();
        String requestHash = idempotencyService.computeHash(inputData);

        // Check idempotency deduplication
        if (effectiveIdempotencyKey != null && !effectiveIdempotencyKey.isBlank()) {
            Optional<UUID> existingIdOpt = idempotencyService.findExistingExecution(effectiveIdempotencyKey, requestHash);
            if (existingIdOpt.isPresent()) {
                log.info("[IDEMPOTENCY] Reusing existing execution {} for key '{}'", existingIdOpt.get(), effectiveIdempotencyKey);
                return getExecution(existingIdOpt.get());
            }
        }

        WorkflowDefinition definition = definitionService.getEntityById(workflowDefinitionId);

        String inputJson;
        try {
            inputJson = objectMapper.writeValueAsString(inputData);
        } catch (JsonProcessingException e) {
            inputJson = "{}";
        }

        WorkflowExecution execution = new WorkflowExecution();
        execution.setWorkflowDefinitionId(definition.getId());
        execution.setWorkflowVersion(definition.getVersion());
        execution.setStatus(WorkflowStatus.PENDING);
        execution.setInputJson(inputJson);
        execution.setIdempotencyKey(effectiveIdempotencyKey);

        WorkflowExecution savedExecution = executionRepository.save(execution);

        // Record idempotency record
        if (effectiveIdempotencyKey != null && !effectiveIdempotencyKey.isBlank()) {
            idempotencyService.recordKey(effectiveIdempotencyKey, requestHash, savedExecution.getId());
        }

        // Initialize StepExecutions from definition JSON
        List<StepExecution> stepEntities = parseStepsFromDefinition(savedExecution.getId(), definition.getDefinitionJson());
        stepRepository.saveAll(stepEntities);

        eventRecorder.recordEvent(
                savedExecution.getId(),
                null,
                EventType.EXECUTION_STARTED,
                "Execution created for workflow '" + definition.getName() + "' with " + stepEntities.size() + " steps",
                inputJson
        );

        // Register failure simulation if requested for demo
        if (request != null && request.failAtStepKey() != null && request.failureMode() != null) {
            failureSimulationService.registerRule(savedExecution.getId(), request.failAtStepKey(), request.failureMode());
        }

        // Trigger worker asynchronously
        final UUID execId = savedExecution.getId();
        workerExecutor.execute(() -> {
            try {
                workflowEngine.processWorkflow(execId);
            } catch (Exception e) {
                log.error("[EXECUTION] Background error processing workflow {}: {}", execId, e.getMessage(), e);
            }
        });

        return getExecution(savedExecution.getId());
    }

    public ExecutionResponse getExecution(UUID executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow execution not found for ID: " + executionId));

        WorkflowDefinition definition = definitionService.getEntityById(execution.getWorkflowDefinitionId());
        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(executionId);

        return mapToExecutionResponse(execution, definition, steps);
    }

    public Page<ExecutionResponse> listExecutions(WorkflowStatus status, Pageable pageable) {
        return listExecutions(status, null, null, null, pageable);
    }

    public Page<ExecutionResponse> listExecutions(
            WorkflowStatus status,
            OffsetDateTime startDate,
            OffsetDateTime endDate,
            String search,
            Pageable pageable
    ) {
        Page<WorkflowExecution> page = executionRepository.findWithFilters(status, startDate, endDate, search, pageable);
        List<UUID> execIds = page.getContent().stream().map(WorkflowExecution::getId).toList();
        Map<UUID, List<StepExecution>> stepsByExecId = stepRepository.findByWorkflowExecutionIdIn(execIds)
                .stream().collect(Collectors.groupingBy(StepExecution::getWorkflowExecutionId));

        return page.map(exec -> {
            WorkflowDefinition def = definitionService.getEntityById(exec.getWorkflowDefinitionId());
            List<StepExecution> steps = stepsByExecId.getOrDefault(exec.getId(), Collections.emptyList());
            return mapToExecutionResponse(exec, def, steps);
        });
    }

    public Page<ExecutionEventResponse> getGlobalEvents(
            UUID workflowExecutionId,
            EventType eventType,
            Pageable pageable
    ) {
        Page<ExecutionEvent> page;
        if (workflowExecutionId != null && eventType != null) {
            page = eventRepository.findByWorkflowExecutionIdAndEventTypeOrderByCreatedAtDesc(workflowExecutionId, eventType, pageable);
        } else if (workflowExecutionId != null) {
            page = eventRepository.findByWorkflowExecutionIdOrderByCreatedAtDesc(workflowExecutionId, pageable);
        } else if (eventType != null) {
            page = eventRepository.findByEventTypeOrderByCreatedAtDesc(eventType, pageable);
        } else {
            page = eventRepository.findAllByOrderByCreatedAtDesc(pageable);
        }

        return page.map(event -> new ExecutionEventResponse(
                event.getId(),
                event.getWorkflowExecutionId(),
                event.getStepExecutionId(),
                event.getEventType(),
                event.getMessage(),
                event.getDetailsJson(),
                event.getCreatedAt()
        ));
    }

    public List<ExecutionEventResponse> getExecutionEvents(UUID executionId) {
        if (!executionRepository.existsById(executionId)) {
            throw new ResourceNotFoundException("Workflow execution not found for ID: " + executionId);
        }
        return eventRepository.findByWorkflowExecutionIdOrderByCreatedAtAsc(executionId).stream()
                .map(event -> new ExecutionEventResponse(
                        event.getId(),
                        event.getWorkflowExecutionId(),
                        event.getStepExecutionId(),
                        event.getEventType(),
                        event.getMessage(),
                        event.getDetailsJson(),
                        event.getCreatedAt()
                ))
                .collect(Collectors.toList());
    }

    @Transactional
    public ExecutionResponse retryExecution(UUID executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow execution not found for ID: " + executionId));

        if (execution.getStatus() != WorkflowStatus.FAILED) {
            throw new WorkflowException("Only FAILED executions can be manually retried. Current status: " + execution.getStatus());
        }

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(executionId);
        for (StepExecution step : steps) {
            if (step.getStatus() == StepStatus.FAILED || step.getStatus() == StepStatus.RETRY_WAIT) {
                step.setStatus(StepStatus.PENDING);
                step.setErrorMessage(null);
                step.setNextRetryAt(null);
                step.setWorkerLeaseOwner(null);
                step.setWorkerLeaseUntil(null);
                stepRepository.save(step);
            }
        }

        execution.setStatus(WorkflowStatus.RUNNING);
        execution.setErrorMessage(null);
        execution.setCompletedAt(null);
        executionRepository.save(execution);

        eventRecorder.recordEvent(
                executionId,
                null,
                EventType.RECOVERY_PERFORMED,
                "Manual retry initiated for failed execution",
                null
        );

        workerExecutor.execute(() -> {
            try {
                workflowEngine.processWorkflow(executionId);
            } catch (Exception e) {
                log.error("[MANUAL-RETRY] Error processing retried workflow {}: {}", executionId, e.getMessage(), e);
            }
        });

        return getExecution(executionId);
    }

    @Transactional
    public ExecutionResponse cancelExecution(UUID executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow execution not found for ID: " + executionId));

        if (execution.getStatus().isTerminal()) {
            throw new WorkflowException("Cannot cancel an execution that is already in terminal state: " + execution.getStatus());
        }

        execution.setStatus(WorkflowStatus.CANCELLED);
        execution.setCompletedAt(OffsetDateTime.now());
        executionRepository.save(execution);

        // Cancel pending or retrying steps
        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(executionId);
        for (StepExecution step : steps) {
            if (!step.getStatus().isTerminal()) {
                step.setStatus(StepStatus.CANCELLED);
                step.setWorkerLeaseOwner(null);
                step.setWorkerLeaseUntil(null);
                stepRepository.save(step);
            }
        }

        eventRecorder.recordEvent(
                executionId,
                null,
                EventType.EXECUTION_CANCELLED,
                "Workflow execution was cancelled by user request",
                null
        );

        return getExecution(executionId);
    }

    @Transactional
    public void deleteExecution(UUID executionId) {
        if (!executionRepository.existsById(executionId)) {
            throw new ResourceNotFoundException("Workflow execution not found for ID: " + executionId);
        }
        executionRepository.deleteById(executionId);
    }

    public WorkflowStatsResponse getStats() {
        long total = executionRepository.count();
        long running = executionRepository.countByStatus(WorkflowStatus.RUNNING);
        long completed = executionRepository.countByStatus(WorkflowStatus.COMPLETED);
        long failed = executionRepository.countByStatus(WorkflowStatus.FAILED);
        long pending = executionRepository.countByStatus(WorkflowStatus.PENDING);
        return new WorkflowStatsResponse(total, running, completed, failed, pending);
    }

    private List<StepExecution> parseStepsFromDefinition(UUID executionId, String definitionJson) {
        List<StepExecution> list = new ArrayList<>();
        try {
            Map<String, Object> root = objectMapper.readValue(definitionJson, new TypeReference<Map<String, Object>>() {});
            Object stepsObj = root.get("steps");
            if (stepsObj instanceof List<?> rawList) {
                for (Object item : rawList) {
                    if (item instanceof Map<?, ?> rawMap) {
                        @SuppressWarnings("unchecked")
                        Map<String, Object> map = (Map<String, Object>) rawMap;
                        String stepKey = (String) map.get("stepKey");
                        Object nameObj = map.get("name");
                        String name = nameObj != null ? nameObj.toString() : stepKey;
                        int order = map.get("order") instanceof Number n ? n.intValue() : list.size() + 1;
                        list.add(new StepExecution(executionId, stepKey, name, order));
                    }
                }
            }
        } catch (Exception e) {
            throw new WorkflowException("Failed to parse definition steps: " + e.getMessage());
        }
        return list;
    }

    private ExecutionResponse mapToExecutionResponse(
            WorkflowExecution exec,
            WorkflowDefinition def,
            List<StepExecution> steps
    ) {
        Long durationMillis = null;
        if (exec.getStartedAt() != null) {
            OffsetDateTime end = exec.getCompletedAt() != null ? exec.getCompletedAt() : OffsetDateTime.now();
            durationMillis = Duration.between(exec.getStartedAt(), end).toMillis();
        }

        List<StepExecutionResponse> stepResponses = steps.stream()
                .map(s -> {
                    Long stepDuration = null;
                    if (s.getStartedAt() != null) {
                        OffsetDateTime end = s.getCompletedAt() != null ? s.getCompletedAt() : OffsetDateTime.now();
                        stepDuration = Duration.between(s.getStartedAt(), end).toMillis();
                    }
                    return new StepExecutionResponse(
                            s.getId(),
                            s.getWorkflowExecutionId(),
                            s.getStepKey(),
                            s.getStepName(),
                            s.getStepOrder(),
                            s.getStatus(),
                            s.getAttemptCount(),
                            s.getInputJson(),
                            s.getOutputJson(),
                            s.getErrorMessage(),
                            s.getNextRetryAt(),
                            s.getWorkerLeaseOwner(),
                            s.getWorkerLeaseUntil(),
                            s.getStartedAt(),
                            s.getCompletedAt(),
                            s.getUpdatedAt(),
                            stepDuration
                    );
                })
                .collect(Collectors.toList());

        return new ExecutionResponse(
                exec.getId(),
                exec.getWorkflowDefinitionId(),
                def != null ? def.getName() : "Unknown Workflow",
                def != null ? def.getDescription() : "",
                exec.getWorkflowVersion(),
                exec.getStatus(),
                exec.getInputJson(),
                exec.getOutputJson(),
                exec.getIdempotencyKey(),
                exec.getCreatedAt(),
                exec.getStartedAt(),
                exec.getCompletedAt(),
                exec.getUpdatedAt(),
                exec.getErrorMessage(),
                durationMillis,
                stepResponses
        );
    }
}
