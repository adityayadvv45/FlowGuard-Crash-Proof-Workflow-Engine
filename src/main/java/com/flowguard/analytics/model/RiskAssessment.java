package com.flowguard.analytics.model;

public record RiskAssessment(
        String riskLevel,
        String retryEligibility,
        String errorClassification,
        int attemptsRemaining,
        int configuredMaxAttempts,
        long recommendedBackoffDelayMs,
        Double empiricalRecoveryRate,
        String recommendation,
        String basis
) {}
