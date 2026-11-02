package com.flowguard.dto;

import com.flowguard.enums.WorkflowStatus;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ExecutionResponse(
        UUID id,
        UUID workflowDefinitionId,
        String workflowName,
        String workflowDescription,
        int workflowVersion,
        WorkflowStatus status,
        String inputJson,
        String outputJson,
        String idempotencyKey,
        OffsetDateTime createdAt,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        OffsetDateTime updatedAt,
        String errorMessage,
        Long durationMillis,
        List<StepExecutionResponse> steps
) {}
