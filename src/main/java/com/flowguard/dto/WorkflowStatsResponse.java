package com.flowguard.dto;

public record WorkflowStatsResponse(
        long totalExecutions,
        long runningExecutions,
        long completedExecutions,
        long failedExecutions,
        long pendingExecutions
) {}
