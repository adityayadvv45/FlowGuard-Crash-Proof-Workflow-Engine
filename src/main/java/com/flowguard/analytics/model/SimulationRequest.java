package com.flowguard.analytics.model;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;

public record SimulationRequest(
        @DecimalMin("0.0")
        Double amount,

        @Min(0)
        Integer attemptCount,

        String errorType
) {}

