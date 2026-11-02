package com.flowguard.analytics.model;

import java.time.OffsetDateTime;

public record ExecutionBaseline(
        int sampleSize,
        double meanDurationMs,
        double stdDevDurationMs,
        double medianDurationMs,
        double iqrDurationMs,
        double meanRetryCount,
        double meanOrderAmount,
        double stdDevOrderAmount,
        int historicalRetriedStepsCount,
        double historicalRecoveryRate,
        OffsetDateTime computedAt,
        String statusNote
) {}
