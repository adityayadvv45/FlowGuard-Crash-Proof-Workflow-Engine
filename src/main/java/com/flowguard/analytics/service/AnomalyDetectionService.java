package com.flowguard.analytics.service;

import com.flowguard.analytics.model.*;
import com.flowguard.entity.ExecutionEvent;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.repository.ExecutionEventRepository;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnomalyDetectionService {

    private static final Logger log = LoggerFactory.getLogger(AnomalyDetectionService.class);

    private final int minBaselineSamples;
    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepRepository;
    private final ExecutionEventRepository eventRepository;
    private final FeatureExtractionService featureExtractionService;
    private final BaselineCalculationService baselineService;
    private final ExecutionRiskAnalyzer riskAnalyzer;

    public AnomalyDetectionService(
            @Value("${flowguard.analytics.min-baseline-samples:5}") int minBaselineSamples,
            WorkflowExecutionRepository executionRepository,
            StepExecutionRepository stepRepository,
            ExecutionEventRepository eventRepository,
            FeatureExtractionService featureExtractionService,
            BaselineCalculationService baselineService,
            ExecutionRiskAnalyzer riskAnalyzer
    ) {
        this.minBaselineSamples = minBaselineSamples;
        this.executionRepository = executionRepository;
        this.stepRepository = stepRepository;
        this.eventRepository = eventRepository;
        this.featureExtractionService = featureExtractionService;
        this.baselineService = baselineService;
        this.riskAnalyzer = riskAnalyzer;
    }

    @Transactional(readOnly = true)
    public AnomalyReport analyzeExecution(UUID executionId) {
        WorkflowExecution execution = executionRepository.findById(executionId)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow execution not found: " + executionId));

        List<StepExecution> steps = stepRepository.findByWorkflowExecutionIdOrderByStepOrderAsc(executionId);
        List<ExecutionEvent> events = eventRepository.findByWorkflowExecutionIdOrderByCreatedAtAsc(executionId);

        ExecutionBaseline baseline = baselineService.getBaseline();
        ExecutionFeatures features = featureExtractionService.extractFeatures(execution, steps, events, null);

        return evaluateFeatures(features, baseline);
    }

    @Transactional(readOnly = true)
    public List<AnomalyReport> analyzeRecentExecutions(int limit) {
        int effectiveLimit = Math.min(100, Math.max(1, limit));
        List<WorkflowExecution> recent = executionRepository.findAll(
                PageRequest.of(0, effectiveLimit, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        if (recent.isEmpty()) {
            return Collections.emptyList();
        }

        List<UUID> ids = recent.stream().map(WorkflowExecution::getId).toList();
        List<StepExecution> allSteps = stepRepository.findByWorkflowExecutionIdIn(ids);
        List<ExecutionEvent> allEvents = eventRepository.findByWorkflowExecutionIdIn(ids);

        Map<UUID, List<StepExecution>> stepsByExecId = allSteps.stream()
                .collect(Collectors.groupingBy(StepExecution::getWorkflowExecutionId));
        Map<UUID, List<ExecutionEvent>> eventsByExecId = allEvents.stream()
                .collect(Collectors.groupingBy(ExecutionEvent::getWorkflowExecutionId));

        ExecutionBaseline baseline = baselineService.getBaseline();
        List<AnomalyReport> reports = new ArrayList<>(recent.size());

        for (WorkflowExecution exec : recent) {
            List<StepExecution> steps = stepsByExecId.getOrDefault(exec.getId(), Collections.emptyList());
            List<ExecutionEvent> events = eventsByExecId.getOrDefault(exec.getId(), Collections.emptyList());
            ExecutionFeatures features = featureExtractionService.extractFeatures(exec, steps, events, null);
            reports.add(evaluateFeatures(features, baseline));
        }

        return reports;
    }

    @Transactional(readOnly = true)
    public AnalyticsSummaryResponse getSummary() {
        List<AnomalyReport> recentReports = analyzeRecentExecutions(50);
        ExecutionBaseline baseline = baselineService.getBaseline();

        int total = recentReports.size();
        int anomalyCount = 0;
        double scoreSum = 0.0;
        Map<String, Integer> severityCounts = new LinkedHashMap<>();
        severityCounts.put("LOW", 0);
        severityCounts.put("MEDIUM", 0);
        severityCounts.put("HIGH", 0);
        severityCounts.put("CRITICAL", 0);

        Map<String, Integer> reasonCodeCounts = new HashMap<>();

        for (AnomalyReport report : recentReports) {
            if (report.isAnomaly()) {
                anomalyCount++;
            }
            scoreSum += report.anomalyScore();
            severityCounts.merge(report.severity(), 1, Integer::sum);

            for (String reason : report.reasonCodes()) {
                reasonCodeCounts.merge(reason, 1, Integer::sum);
            }
        }

        double anomalyRate = total > 0 ? (anomalyCount * 100.0) / total : 0.0;
        double avgScore = total > 0 ? scoreSum / total : 0.0;

        String health;
        if (total == 0) {
            health = "COLD_START";
        } else if (anomalyRate > 25.0 || severityCounts.getOrDefault("CRITICAL", 0) > 2) {
            health = "ELEVATED_RISK";
        } else if (anomalyRate > 10.0) {
            health = "DEGRADED_ATTENTION";
        } else {
            health = "HEALTHY";
        }

        return new AnalyticsSummaryResponse(
                total,
                anomalyCount,
                Math.round(anomalyRate * 10.0) / 10.0,
                Math.round(avgScore * 100.0) / 100.0,
                severityCounts,
                reasonCodeCounts,
                baseline,
                health
        );
    }

    public AnomalyReport evaluateFeatures(ExecutionFeatures features, ExecutionBaseline baseline) {
        List<ContributingFeature> contributing = new ArrayList<>();
        List<String> reasonCodes = new ArrayList<>();

        boolean isBaselineReliable = baseline != null && baseline.sampleSize() >= minBaselineSamples;
        AnalysisStatus status = isBaselineReliable ? AnalysisStatus.EVALUATED : AnalysisStatus.INSUFFICIENT_DATA;

        // 1. Duration Evaluation (handle zero variance and small samples explicitly)
        double durScore = 0.0;
        boolean durOutlier = false;
        if (features.durationMs() > 0) {
            if (isBaselineReliable) {
                double meanDur = baseline.meanDurationMs();
                double stdDur = baseline.stdDevDurationMs();
                double medianDur = baseline.medianDurationMs();
                double iqrDur = baseline.iqrDurationMs();

                // Check zero/low variance condition
                if (stdDur < 20.0 && iqrDur < 20.0) {
                    // Constant runtime: only flag if duration exceeds 2x median AND > 2000ms delta
                    durOutlier = features.durationMs() > (medianDur * 2.0) && (features.durationMs() - medianDur) > 2000L;
                    durScore = durOutlier ? 0.70 : 0.0;
                } else {
                    double effectiveStd = Math.max(150.0, stdDur);
                    double zDur = Math.max(0.0, (features.durationMs() - meanDur) / effectiveStd);
                    // Outlier require both Z-score and IQR threshold agreement, plus minimum absolute delta
                    durOutlier = zDur >= 2.5 &&
                                 features.durationMs() > (medianDur + 2.0 * iqrDur) &&
                                 (features.durationMs() - medianDur) > 1500L;
                    durScore = Math.min(1.0, zDur / 4.0);
                }

                if (durOutlier) {
                    reasonCodes.add("DURATION_SPIKE");
                }
            } else {
                // Baseline is unreliable: do not flag duration outlier
                durScore = 0.0;
                durOutlier = false;
            }
        }
        contributing.add(new ContributingFeature(
                "executionDurationMs",
                features.durationMs(),
                baseline != null ? baseline.meanDurationMs() : 0.0,
                baseline != null ? baseline.stdDevDurationMs() : 0.0,
                Math.round(durScore * 100.0) / 100.0,
                durOutlier,
                "Observed execution duration: " + features.durationMs() + "ms"
        ));

        // 2. Retry Evaluation (deterministic observation)
        double retryScore = Math.min(1.0, features.retryCount() * 0.40);
        boolean retryOutlier = features.retryCount() >= 2;
        if (features.retryCount() > 0) {
            reasonCodes.add(retryOutlier ? "HIGH_RETRY_COUNT" : "TRANSIENT_RETRY");
        }
        contributing.add(new ContributingFeature(
                "retryCount",
                features.retryCount(),
                baseline != null ? baseline.meanRetryCount() : 0.0,
                1.0,
                Math.round(retryScore * 100.0) / 100.0,
                retryOutlier,
                "Total step retries observed: " + features.retryCount()
        ));

        // 3. Step Failure Evaluation (factual terminal failure)
        double failScore = features.stepFailureRate();
        boolean failOutlier = features.stepFailureRate() > 0.0;
        if (failOutlier) {
            reasonCodes.add("STEP_FAILURE_PERSISTENCE");
        }
        contributing.add(new ContributingFeature(
                "stepFailureRate",
                features.stepFailureRate(),
                0.0,
                0.1,
                Math.round(failScore * 100.0) / 100.0,
                failOutlier,
                "Observed step failure rate: " + Math.round(features.stepFailureRate() * 100.0) + "%"
        ));

        // 4. Infrastructure Incidents Evaluation (timeouts & crashes)
        int incidentCount = features.timeoutCount() + (features.crashCount() * 2);
        double incidentScore = Math.min(1.0, incidentCount * 0.45);
        boolean incidentOutlier = incidentCount > 0;
        if (features.timeoutCount() > 0) {
            reasonCodes.add("TIMEOUT_PERSISTENCE");
        }
        if (features.crashCount() > 0) {
            reasonCodes.add("WORKER_CRASH_RECOVERY");
        }
        contributing.add(new ContributingFeature(
                "infrastructureIncidents",
                incidentCount,
                0.0,
                1.0,
                Math.round(incidentScore * 100.0) / 100.0,
                incidentOutlier,
                "Observed 504 timeouts (" + features.timeoutCount() + ") and crash sweeps (" + features.crashCount() + ")"
        ));

        // 5. Order Amount Evaluation (handle missing/null amount explicitly)
        double amountScore = 0.0;
        boolean amountOutlier = false;
        if (features.orderAmount() != null) {
            if (isBaselineReliable) {
                double meanAmt = baseline.meanOrderAmount();
                double stdAmt = baseline.stdDevOrderAmount();
                if (stdAmt < 10.0) {
                    amountOutlier = Math.abs(features.orderAmount() - meanAmt) > 500.0;
                    amountScore = amountOutlier ? 0.65 : 0.0;
                } else {
                    double zAmt = Math.abs(features.orderAmount() - meanAmt) / Math.max(15.0, stdAmt);
                    amountOutlier = zAmt >= 2.5;
                    amountScore = Math.min(1.0, zAmt / 4.0);
                }
                if (amountOutlier) {
                    reasonCodes.add("UNUSUAL_PAYLOAD_VOLUME");
                }
            } else {
                amountScore = 0.0;
                amountOutlier = false;
            }
            contributing.add(new ContributingFeature(
                    "orderAmount",
                    features.orderAmount(),
                    baseline != null ? baseline.meanOrderAmount() : 0.0,
                    baseline != null ? baseline.stdDevOrderAmount() : 0.0,
                    Math.round(amountScore * 100.0) / 100.0,
                    amountOutlier,
                    "Payload amount: " + features.orderAmount()
            ));
        }

        // Composite Anomaly Score
        double compositeScore;
        boolean isAnomaly;

        if (!isBaselineReliable) {
            // Guard: When baseline is unreliable, only unambiguous functional failures can be anomalous
            if (features.status() == WorkflowStatus.FAILED || failOutlier || features.retryCount() >= 2) {
                compositeScore = Math.max(0.60, failScore);
                isAnomaly = true;
            } else {
                compositeScore = 0.05;
                isAnomaly = false;
            }
        } else {
            compositeScore = (durScore * 0.25) +
                             (retryScore * 0.30) +
                             (failScore * 0.25) +
                             (incidentScore * 0.15) +
                             (amountScore * 0.05);

            compositeScore = Math.max(0.0, Math.min(1.0, compositeScore));
            isAnomaly = compositeScore >= 0.55 || failOutlier || (features.retryCount() >= 2);
        }

        compositeScore = Math.round(compositeScore * 100.0) / 100.0;

        if (reasonCodes.isEmpty()) {
            reasonCodes.add(!isBaselineReliable ? "INSUFFICIENT_BASELINE_DATA" : "NORMAL_OPERATIONAL_DISTRIBUTION");
        }

        // Severity Determination
        String severity;
        if (features.status() == WorkflowStatus.FAILED || compositeScore >= 0.80) {
            severity = "CRITICAL";
        } else if (compositeScore >= 0.55 || isAnomaly) {
            severity = "HIGH";
        } else if (compositeScore >= 0.30) {
            severity = "MEDIUM";
        } else {
            severity = "LOW";
        }

        RiskAssessment riskAssessment = riskAnalyzer.assessRisk(features, baseline);
        String explanation = buildExplanation(compositeScore, severity, reasonCodes, features, isAnomaly, isBaselineReliable);

        return new AnomalyReport(
                features.executionId(),
                compositeScore,
                isAnomaly,
                severity,
                status,
                "STATISTICAL_DISTRIBUTION_ANALYSIS",
                reasonCodes,
                contributing,
                riskAssessment,
                explanation,
                OffsetDateTime.now()
        );
    }

    private String buildExplanation(
            double score,
            String severity,
            List<String> reasonCodes,
            ExecutionFeatures features,
            boolean isAnomaly,
            boolean isBaselineReliable
    ) {
        if (!isBaselineReliable && !isAnomaly) {
            return "Baseline sample size is insufficient for distribution-based outlier detection. Execution exhibits no runtime errors or retry failures.";
        }

        if (!isAnomaly && "LOW".equals(severity)) {
            return "Execution parameters within normal statistical distribution. No performance or retry anomalies detected.";
        }

        StringBuilder sb = new StringBuilder();
        if (features.status() == WorkflowStatus.FAILED) {
            sb.append("Workflow execution placed in FAILED status. ");
        }
        if (reasonCodes.contains("WORKER_CRASH_RECOVERY")) {
            sb.append("Worker process interruption detected; lease recovery initiated. ");
        }
        if (reasonCodes.contains("TIMEOUT_PERSISTENCE") || reasonCodes.contains("HIGH_RETRY_COUNT")) {
            sb.append("Observed ").append(features.retryCount())
              .append(" retries with downstream timeout indicators. ");
        }
        if (reasonCodes.contains("DURATION_SPIKE")) {
            sb.append("Observed duration of ").append(features.durationMs())
              .append("ms exceeded historical baseline median. ");
        }
        if (reasonCodes.contains("UNUSUAL_PAYLOAD_VOLUME") && features.orderAmount() != null) {
            sb.append("Order amount (").append(features.orderAmount())
              .append(") is a statistical outlier relative to baseline. ");
        }

        if (sb.isEmpty()) {
            sb.append("Mild parameter variance detected; monitoring recommended.");
        }

        return sb.toString().trim();
    }
}
