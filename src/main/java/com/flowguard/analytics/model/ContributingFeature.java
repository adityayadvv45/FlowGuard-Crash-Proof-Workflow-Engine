package com.flowguard.analytics.model;

public record ContributingFeature(
        String featureName,
        double observedValue,
        double baselineMean,
        double baselineStdDev,
        double deviationScore,
        boolean outlier,
        String description
) {}

