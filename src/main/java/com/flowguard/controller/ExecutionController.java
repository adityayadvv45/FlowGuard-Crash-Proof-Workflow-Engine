package com.flowguard.controller;

import com.flowguard.analytics.model.AnomalyReport;
import com.flowguard.analytics.service.AnomalyDetectionService;
import com.flowguard.dto.*;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.service.FailureSimulationService;
import com.flowguard.service.WorkflowExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/executions")
@Tag(name = "Workflow Executions", description = "Endpoints for inspecting and managing execution runs")
public class ExecutionController {

    private final WorkflowExecutionService executionService;
    private final FailureSimulationService failureSimulationService;
    private final AnomalyDetectionService anomalyDetectionService;

    public ExecutionController(
            WorkflowExecutionService executionService,
            FailureSimulationService failureSimulationService,
            AnomalyDetectionService anomalyDetectionService) {
        this.executionService = executionService;
        this.failureSimulationService = failureSimulationService;
        this.anomalyDetectionService = anomalyDetectionService;
    }

    @GetMapping
    @Operation(summary = "List workflow executions with pagination, search, status, and date range filters")
    public ResponseEntity<Page<ExecutionResponse>> listExecutions(
            @RequestParam(required = false) WorkflowStatus status,
            @RequestParam(required = false) java.time.OffsetDateTime startDate,
            @RequestParam(required = false) java.time.OffsetDateTime endDate,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(executionService.listExecutions(status, startDate, endDate, search, pageable));
    }

    @GetMapping("/stats")
    @Operation(summary = "Get aggregate execution metrics for the dashboard")
    public ResponseEntity<WorkflowStatsResponse> getStats() {
        return ResponseEntity.ok(executionService.getStats());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get detailed execution status and step-level pipeline")
    public ResponseEntity<ExecutionResponse> getExecution(@PathVariable UUID id) {
        return ResponseEntity.ok(executionService.getExecution(id));
    }

    @GetMapping("/{id}/anomaly")
    @Operation(summary = "Get statistical anomaly and risk analysis for an execution")
    public ResponseEntity<AnomalyReport> getExecutionAnomaly(@PathVariable UUID id) {
        return ResponseEntity.ok(anomalyDetectionService.analyzeExecution(id));
    }

    @GetMapping("/{id}/events")
    @Operation(summary = "Get ordered event history for an execution")
    public ResponseEntity<List<ExecutionEventResponse>> getEvents(@PathVariable UUID id) {
        return ResponseEntity.ok(executionService.getExecutionEvents(id));
    }

    @PostMapping("/{id}/retry")
    @Operation(summary = "Manually trigger a retry for an eligible failed execution")
    public ResponseEntity<ExecutionResponse> retryExecution(@PathVariable UUID id) {
        return ResponseEntity.ok(executionService.retryExecution(id));
    }

    @PostMapping("/{id}/cancel")
    @Operation(summary = "Cancel an active or pending workflow execution")
    public ResponseEntity<ExecutionResponse> cancelExecution(@PathVariable UUID id) {
        return ResponseEntity.ok(executionService.cancelExecution(id));
    }

    @PostMapping("/{id}/simulate-failure")
    @Operation(summary = "Inject a controlled failure or crash for demonstration purposes")
    public ResponseEntity<Map<String, String>> simulateFailure(
            @PathVariable UUID id,
            @Valid @RequestBody SimulateFailureRequest request) {
        failureSimulationService.registerRule(id, request.stepKey(), request.mode());
        return ResponseEntity.ok(Map.of(
                "message", "Failure simulation registered for execution " + id + " on step '" + request.stepKey()
                        + "' with mode " + request.mode()));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete an execution record")
    public ResponseEntity<Void> deleteExecution(@PathVariable UUID id) {
        executionService.deleteExecution(id);
        return ResponseEntity.noContent().build();
    }
}
