package com.flowguard.analytics;

import com.flowguard.analytics.model.*;
import com.flowguard.analytics.service.AnomalyDetectionService;
import com.flowguard.analytics.service.BaselineCalculationService;
import com.flowguard.analytics.service.ExecutionRiskAnalyzer;
import com.flowguard.analytics.service.FeatureExtractionService;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.repository.ExecutionEventRepository;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import com.flowguard.service.RetryService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

/**
 * Unit tests for AnomalyDetectionService, BaselineCalculation, and ExecutionRiskAnalyzer.
 * Verifies mathematical bounds, cold start guards, zero-variance safety,
 * deterministic risk classification, and multivariate outlier detection.
 */
@ExtendWith(MockitoExtension.class)
class AnomalyDetectionServiceUnitTest {

    @Mock
    private WorkflowExecutionRepository executionRepository;

    @Mock
    private StepExecutionRepository stepRepository;

    @Mock
    private ExecutionEventRepository eventRepository;

    @Mock
    private FeatureExtractionService featureExtractionService;

    @Mock
    private BaselineCalculationService baselineService;

    @Mock
    private RetryService retryService;

    private ExecutionRiskAnalyzer riskAnalyzer;
    private AnomalyDetectionService anomalyDetectionService;

    @BeforeEach
    void setUp() {
        when(retryService.getMaxAttempts()).thenReturn(3);
        riskAnalyzer = new ExecutionRiskAnalyzer(retryService);
        anomalyDetectionService = new AnomalyDetectionService(
                5, // minBaselineSamples = 5
                executionRepository,
                stepRepository,
                eventRepository,
                featureExtractionService,
                baselineService,
                riskAnalyzer
        );
    }

    @Test
    @DisplayName("Cold Start Protection: insufficient baseline samples yields INSUFFICIENT_DATA and score 0.0")
    void shouldHandleInsufficientBaselineSamplesSafely() {
        // Baseline with only 2 historical samples (< 5 threshold)
        ExecutionBaseline coldStartBaseline = new ExecutionBaseline(
                2,
                1500.0,
                200.0,
                1450.0,
                100.0,
                0.0,
                150.0,
                50.0,
                0,
                0.0,
                OffsetDateTime.now(),
                "Cold start: insufficient baseline samples"
        );

        ExecutionFeatures features = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.COMPLETED,
                2500L,
                Map.of("VALIDATE_ORDER", 200L, "PROCESS_PAYMENT", 2300L),
                4,
                0,
                0.0,
                0,
                0,
                120.0,
                OffsetDateTime.now(),
                null
        );

        AnomalyReport report = anomalyDetectionService.evaluateFeatures(features, coldStartBaseline);

        assertNotNull(report);
        assertEquals(AnalysisStatus.INSUFFICIENT_DATA, report.status());
        assertFalse(report.isAnomaly(), "Execution must not be flagged as anomalous during cold start baseline");
        assertEquals(0.0, report.anomalyScore(), 0.001);
        assertEquals("LOW", report.severity());
        assertTrue(report.notes().contains("Insufficient baseline data"), "Report note should clearly state cold start status");
    }

    @Test
    @DisplayName("Zero Variance Guard: identical historical durations do not trigger division by zero or false anomalies")
    void shouldSafelyHandleZeroVarianceHistoricalDuration() {
        // Zero variance: stdDev = 0.0 and IQR = 0.0 (e.g. constant 1000ms duration)
        ExecutionBaseline zeroVarianceBaseline = new ExecutionBaseline(
                20,
                1000.0,
                0.0,
                1000.0,
                0.0,
                0.0,
                100.0,
                0.0,
                0,
                0.0,
                OffsetDateTime.now(),
                "Zero variance baseline"
        );

        // Feature with minor 100ms drift (1100ms) - should NOT trigger an anomaly
        ExecutionFeatures minorDrift = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.COMPLETED,
                1100L,
                Map.of("VALIDATE_ORDER", 1100L),
                1,
                0,
                0.0,
                0,
                0,
                100.0,
                OffsetDateTime.now(),
                null
        );

        AnomalyReport normalReport = anomalyDetectionService.evaluateFeatures(minorDrift, zeroVarianceBaseline);
        assertNotNull(normalReport);
        assertFalse(normalReport.isAnomaly(), "Minor drift in zero variance baseline must not trigger anomaly");
        assertEquals("LOW", normalReport.severity());

        // Extreme spike (5000ms > 2x median AND > 2000ms delta)
        ExecutionFeatures severeSpike = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.COMPLETED,
                5500L,
                Map.of("VALIDATE_ORDER", 5500L),
                1,
                0,
                0.0,
                0,
                0,
                100.0,
                OffsetDateTime.now(),
                null
        );

        AnomalyReport spikeReport = anomalyDetectionService.evaluateFeatures(severeSpike, zeroVarianceBaseline);
        assertNotNull(spikeReport);
        assertTrue(spikeReport.isAnomaly(), "5.5x spike in zero-variance runtime must be flagged");
        assertTrue(spikeReport.reasonCodes().contains("DURATION_SPIKE"));
    }

    @Test
    @DisplayName("Multivariate Outlier: combined duration spike + retries + failure triggers CRITICAL severity")
    void shouldFlagSevereMultivariateAnomaly() {
        ExecutionBaseline reliableBaseline = new ExecutionBaseline(
                50,
                1200.0,
                150.0,
                1180.0,
                120.0,
                0.05,
                95.0,
                25.0,
                2,
                0.90,
                OffsetDateTime.now(),
                "Reliable multi-run baseline"
        );

        // Execution with huge duration, 2 retries, step failure, and timeout
        ExecutionFeatures troubledFeatures = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.FAILED,
                8500L, // Baseline is 1200ms
                Map.of("VALIDATE_ORDER", 500L, "PROCESS_PAYMENT", 8000L),
                3,
                2, // 2 retries
                0.33,
                1, // 1 timeout
                0,
                95.0,
                OffsetDateTime.now(),
                "Payment gateway 504 Gateway Timeout on attempt 3"
        );

        AnomalyReport report = anomalyDetectionService.evaluateFeatures(troubledFeatures, reliableBaseline);

        assertNotNull(report);
        assertTrue(report.isAnomaly(), "Multivariate anomaly must be detected");
        assertEquals(AnalysisStatus.EVALUATED, report.status());
        assertEquals("CRITICAL", report.severity());
        assertTrue(report.anomalyScore() >= 0.70, "Anomaly score should reflect compound severity");
        assertTrue(report.reasonCodes().contains("DURATION_SPIKE"));
        assertTrue(report.reasonCodes().contains("MULTIPLE_RETRIES"));
        assertTrue(report.reasonCodes().contains("TIMEOUT_OBSERVED"));
        assertTrue(report.reasonCodes().contains("TERMINAL_FAILURE"));
    }

    @Test
    @DisplayName("Deterministic Risk Analyzer: permanent business error classified as non-retryable")
    void shouldDeterministicallyClassifyPermanentBusinessError() {
        ExecutionFeatures permanentErrorFeatures = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.FAILED,
                800L,
                Collections.emptyMap(),
                1,
                0,
                1.0,
                0,
                0,
                50.0,
                OffsetDateTime.now(),
                "Card declined: insufficient funds in account"
        );

        RiskAssessment assessment = riskAnalyzer.assessRisk(permanentErrorFeatures, null);

        assertNotNull(assessment);
        assertEquals("PERMANENT_VALIDATION_OR_DECLINE", assessment.errorClassification());
        assertEquals("PERMANENT_NON_RETRYABLE", assessment.retryEligibility());
        assertEquals("CRITICAL", assessment.riskLevel());
        assertFalse(assessment.retryRecommended(), "Automated retries must not be recommended for permanent card decline");
        assertTrue(assessment.basis().contains("non-retryable"));
    }

    @Test
    @DisplayName("Deterministic Risk Analyzer: transient gateway timeout classified as retry eligible")
    void shouldDeterministicallyClassifyTransientTimeoutAsRetryEligible() {
        ExecutionFeatures transientTimeoutFeatures = new ExecutionFeatures(
                UUID.randomUUID(),
                "OrderFulfillment",
                WorkflowStatus.RUNNING,
                3000L,
                Collections.emptyMap(),
                1, // 1 attempt, max 3
                0,
                0.0,
                1, // 1 timeout
                0,
                150.0,
                OffsetDateTime.now(),
                "HTTP 504 Gateway Timeout connecting to payment gateway"
        );

        RiskAssessment assessment = riskAnalyzer.assessRisk(transientTimeoutFeatures, null);

        assertNotNull(assessment);
        assertEquals("TRANSIENT_TIMEOUT", assessment.errorClassification());
        assertEquals("ELIGIBLE_FOR_RETRY", assessment.retryEligibility());
        assertTrue(assessment.retryRecommended(), "Transient timeouts must be eligible for retry");
        assertTrue(assessment.recommendation().contains("exponential backoff with jitter"));
    }
}
