package com.flowguard.controller;

import com.flowguard.dto.CreateWorkflowRequest;
import com.flowguard.dto.ExecutionResponse;
import com.flowguard.dto.StartExecutionRequest;
import com.flowguard.dto.WorkflowDefinitionResponse;
import com.flowguard.service.WorkflowDefinitionService;
import com.flowguard.service.WorkflowExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/workflows")
@Tag(name = "Workflow Definitions", description = "Endpoints for defining and instantiating workflows")
public class WorkflowController {

    private final WorkflowDefinitionService definitionService;
    private final WorkflowExecutionService executionService;

    public WorkflowController(WorkflowDefinitionService definitionService, WorkflowExecutionService executionService) {
        this.definitionService = definitionService;
        this.executionService = executionService;
    }

    @PostMapping
    @Operation(summary = "Create a new workflow definition")
    public ResponseEntity<WorkflowDefinitionResponse> createWorkflow(@Valid @RequestBody CreateWorkflowRequest request) {
        WorkflowDefinitionResponse created = definitionService.createDefinition(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @GetMapping
    @Operation(summary = "List all workflow definitions")
    public ResponseEntity<List<WorkflowDefinitionResponse>> listWorkflows() {
        return ResponseEntity.ok(definitionService.getAllDefinitions());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Get a workflow definition by ID")
    public ResponseEntity<WorkflowDefinitionResponse> getWorkflow(@PathVariable UUID id) {
        return ResponseEntity.ok(definitionService.getDefinitionById(id));
    }

    @PostMapping("/{id}/executions")
    @Operation(summary = "Start a workflow execution")
    public ResponseEntity<ExecutionResponse> startExecution(
            @PathVariable UUID id,
            @RequestBody(required = false) StartExecutionRequest request,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyHeader
    ) {
        ExecutionResponse response = executionService.startExecution(id, request, idempotencyHeader);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
