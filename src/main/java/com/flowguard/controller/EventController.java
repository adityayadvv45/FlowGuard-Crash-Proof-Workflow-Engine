package com.flowguard.controller;

import com.flowguard.dto.ExecutionEventResponse;
import com.flowguard.enums.EventType;
import com.flowguard.service.WorkflowExecutionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/events")
@Tag(name = "Global Event History", description = "Endpoints for inspecting audit trails across all workflow executions")
public class EventController {

    private final WorkflowExecutionService executionService;

    public EventController(WorkflowExecutionService executionService) {
        this.executionService = executionService;
    }

    @GetMapping
    @Operation(summary = "List global audit events with pagination and filters")
    public ResponseEntity<Page<ExecutionEventResponse>> listEvents(
            @RequestParam(required = false) UUID workflowExecutionId,
            @RequestParam(required = false) EventType eventType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "30") int size
    ) {
        Pageable pageable = PageRequest.of(page, Math.min(100, Math.max(1, size)), Sort.by(Sort.Direction.DESC, "createdAt"));
        return ResponseEntity.ok(executionService.getGlobalEvents(workflowExecutionId, eventType, pageable));
    }
}

