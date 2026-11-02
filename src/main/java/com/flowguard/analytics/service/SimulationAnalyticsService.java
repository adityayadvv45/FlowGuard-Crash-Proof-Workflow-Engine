package com.flowguard.analytics.service;

import com.flowguard.analytics.model.AnomalyReport;
import com.flowguard.analytics.model.ExecutionBaseline;
import com.flowguard.analytics.model.ExecutionFeatures;
import com.flowguard.analytics.model.SimulationRequest;
import com.flowguard.enums.WorkflowStatus;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

@Service
public class SimulationAnalyticsService {

    private final AnomalyDetectionService anomalyDetectionService;
    private final BaselineCalculationService baselineService;

    public SimulationAnalyticsService(
            AnomalyDetectionService anomalyDetectionService,
            BaselineCalculationService baselineService
    ) {
        this.anomalyDetectionService = anomalyDetectionService;
        this.baselineService = baselineService;
    }

    public AnomalyReport simulate(SimulationRequest request) {
        double amount = request.amount() != null ? request.amount() : 100.0;
        int attempts = request.attemptCount() != null ? Math.max(1, request.attemptCount()) : 1;
        int retryCount = Math.max(0, attempts - 1);
        String err = request.errorType() != null && !"none".equalsIgnoreCase(request.errorType())
                ? request.errorType()
                : null;

        boolean isCrash = err != null && err.toLowerCase().contains("crash");
        boolean isTimeout = err != null && (err.contains("504") || err.toLowerCase().contains("timeout"));
        boolean isDeclined = err != null && (err.toLowerCase().contains("declined") || err.toLowerCase().contains("insufficient"));

        WorkflowStatus status = isDeclined ? WorkflowStatus.FAILED : WorkflowStatus.COMPLETED;
        long durationMs = 1200L + (retryCount * 2500L);

        ExecutionFeatures simulatedFeatures = new ExecutionFeatures(
                UUID.randomUUID(),
                "Simulation Playground",
                status,
                durationMs,
                Map.of("SIMULATED_STEP", durationMs),
                attempts,
                retryCount,
                isDeclined ? 1.0 : 0.0,
                isTimeout ? 1 : 0,
                isCrash ? 1 : 0,
                amount,
                OffsetDateTime.now(),
                err
        );

        ExecutionBaseline baseline = baselineService.getBaseline();
        return anomalyDetectionService.evaluateFeatures(simulatedFeatures, baseline);
    }
}

