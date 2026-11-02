package com.flowguard.analytics.model;

import java.util.Map;

public record AnalyticsSummaryResponse(
        int totalExecutionsAnalyzed,
        int anomaliesDetected,
        double anomalyRatePercent,
        double averageAnomalyScore,
        Map<String, Integer> severityBreakdown,
        Map<String, Integer> reasonCodeCounts,
        ExecutionBaseline baseline,
        String engineHealth
) {}

