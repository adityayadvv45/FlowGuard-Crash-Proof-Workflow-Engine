package com.flowguard.analytics.model;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AnomalyReport(
        UUID executionId,
        double anomalyScore,
        boolean isAnomaly,
        String severity,
        AnalysisStatus status,
        String modelType,
        List<String> reasonCodes,
        List<ContributingFeature> contributingFeatures,
        RiskAssessment riskAssessment,
        String explanation,
        OffsetDateTime analyzedAt
) {}

