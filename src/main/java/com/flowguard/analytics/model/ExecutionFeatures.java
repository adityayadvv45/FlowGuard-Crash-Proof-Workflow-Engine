package com.flowguard.analytics.model;

import com.flowguard.enums.WorkflowStatus;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

public record ExecutionFeatures(
        UUID executionId,
        String workflowName,
        WorkflowStatus status,
        long durationMs,
        Map<String, Long> stepDurationsMs,
        int totalStepAttempts,
        int retryCount,
        double stepFailureRate,
        int timeoutCount,
        int crashCount,
        Double orderAmount,
        OffsetDateTime createdAt,
        String errorMessage
) {}

