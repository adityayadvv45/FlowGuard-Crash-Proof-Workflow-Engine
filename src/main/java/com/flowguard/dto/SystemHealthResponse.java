package com.flowguard.dto;

import java.time.OffsetDateTime;

public record SystemHealthResponse(
        String status,
        String databaseStatus,
        String workerId,
        int activeWorkers,
        int workerPoolSize,
        int workerQueueSize,
        int workerQueueCapacity,
        long activeLeasesCount,
        long leaseDurationSeconds,
        long recoveryIntervalSeconds,
        long retryPollIntervalSeconds,
        long uptimeMillis,
        long heapUsedMb,
        long heapMaxMb,
        OffsetDateTime timestamp
) {}
