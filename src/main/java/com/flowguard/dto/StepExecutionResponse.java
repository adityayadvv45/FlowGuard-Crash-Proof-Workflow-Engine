package com.flowguard.dto;

import com.flowguard.enums.StepStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record StepExecutionResponse(
        UUID id,
        UUID workflowExecutionId,
        String stepKey,
        String stepName,
        int stepOrder,
        StepStatus status,
        int attemptCount,
        String inputJson,
        String outputJson,
        String errorMessage,
        OffsetDateTime nextRetryAt,
        String workerLeaseOwner,
        OffsetDateTime workerLeaseUntil,
        OffsetDateTime startedAt,
        OffsetDateTime completedAt,
        OffsetDateTime updatedAt,
        Long durationMillis
) {}
