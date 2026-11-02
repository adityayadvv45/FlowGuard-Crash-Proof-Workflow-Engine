package com.flowguard.analytics.controller;

import com.flowguard.analytics.model.AnalyticsSummaryResponse;
import com.flowguard.analytics.model.AnomalyReport;
import com.flowguard.analytics.model.SimulationRequest;
import com.flowguard.analytics.service.AnomalyDetectionService;
import com.flowguard.analytics.service.SimulationAnalyticsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/analytics")
@Tag(name = "Execution Analytics & Anomaly Detection", description = "Endpoints for statistical anomaly detection, risk analysis, and execution diagnostics")
public class AnalyticsController {

    private final AnomalyDetectionService anomalyDetectionService;
    private final SimulationAnalyticsService simulationService;

    public AnalyticsController(
            AnomalyDetectionService anomalyDetectionService,
            SimulationAnalyticsService simulationService
    ) {
        this.anomalyDetectionService = anomalyDetectionService;
        this.simulationService = simulationService;
    }

    @GetMapping("/executions/{id}")
    @Operation(summary = "Get detailed statistical anomaly and risk analysis for an execution")
    public ResponseEntity<AnomalyReport> getExecutionAnomaly(@PathVariable UUID id) {
        return ResponseEntity.ok(anomalyDetectionService.analyzeExecution(id));
    }

    @GetMapping("/recent")
    @Operation(summary = "List anomaly assessments across recent executions")
    public ResponseEntity<List<AnomalyReport>> getRecentAnomalies(@RequestParam(defaultValue = "20") int limit) {
        return ResponseEntity.ok(anomalyDetectionService.analyzeRecentExecutions(limit));
    }

    @GetMapping("/summary")
    @Operation(summary = "Get aggregate anomaly summary metrics and baseline distributions")
    public ResponseEntity<AnalyticsSummaryResponse> getSummary() {
        return ResponseEntity.ok(anomalyDetectionService.getSummary());
    }

    @PostMapping("/simulate")
    @Operation(summary = "Evaluate arbitrary parameters against statistical baseline (Playground Inference)")
    public ResponseEntity<AnomalyReport> simulateAnomaly(@Valid @RequestBody SimulationRequest request) {
        return ResponseEntity.ok(simulationService.simulate(request));
    }
}

