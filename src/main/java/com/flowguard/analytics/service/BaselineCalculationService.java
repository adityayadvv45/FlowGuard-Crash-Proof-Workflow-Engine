package com.flowguard.analytics.service;

import com.flowguard.analytics.model.ExecutionBaseline;
import com.flowguard.analytics.model.ExecutionFeatures;
import com.flowguard.entity.ExecutionEvent;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.repository.ExecutionEventRepository;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class BaselineCalculationService {

    private static final Logger log = LoggerFactory.getLogger(BaselineCalculationService.class);
    private static final long CACHE_TTL_MILLIS = 15_000L;

    private final int minBaselineSamples;
    private final int maxHistorySamples;
    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepRepository;
    private final ExecutionEventRepository eventRepository;
    private final FeatureExtractionService featureExtractionService;

    private volatile ExecutionBaseline cachedBaseline = null;
    private volatile long lastCalculatedTimestamp = 0L;

    public BaselineCalculationService(
            @Value("${flowguard.analytics.min-baseline-samples:5}") int minBaselineSamples,
            @Value("${flowguard.analytics.max-history-samples:100}") int maxHistorySamples,
            WorkflowExecutionRepository executionRepository,
            StepExecutionRepository stepRepository,
            ExecutionEventRepository eventRepository,
            FeatureExtractionService featureExtractionService
    ) {
        this.minBaselineSamples = minBaselineSamples;
        this.maxHistorySamples = maxHistorySamples;
        this.executionRepository = executionRepository;
        this.stepRepository = stepRepository;
        this.eventRepository = eventRepository;
        this.featureExtractionService = featureExtractionService;
    }

    public ExecutionBaseline getBaseline() {
        long now = System.currentTimeMillis();
        ExecutionBaseline current = cachedBaseline;
        if (current != null && (now - lastCalculatedTimestamp) < CACHE_TTL_MILLIS) {
            return current;
        }

        synchronized (this) {
            if (cachedBaseline != null && (System.currentTimeMillis() - lastCalculatedTimestamp) < CACHE_TTL_MILLIS) {
                return cachedBaseline;
            }
            ExecutionBaseline calculated = computeBaseline();
            this.cachedBaseline = calculated;
            this.lastCalculatedTimestamp = System.currentTimeMillis();
            return calculated;
        }
    }

    public void invalidateCache() {
        this.cachedBaseline = null;
        this.lastCalculatedTimestamp = 0L;
    }

    private ExecutionBaseline computeBaseline() {
        // Query recent terminal executions using strict limit
        List<WorkflowExecution> recentExecutions = executionRepository.findAll(
                PageRequest.of(0, maxHistorySamples, Sort.by(Sort.Direction.DESC, "createdAt"))
        ).getContent();

        if (recentExecutions.isEmpty()) {
            return new ExecutionBaseline(
                    0,
                    1500.0,
                    500.0,
                    1200.0,
                    400.0,
                    0.0,
                    150.0,
                    50.0,
                    0,
                    0.0,
                    OffsetDateTime.now(),
                    "No historical execution data found in database. Initial cold-start defaults active."
            );
        }

        List<UUID> execIds = recentExecutions.stream().map(WorkflowExecution::getId).toList();

        // Batch fetch steps and events to avoid N+1 queries
        List<StepExecution> allSteps = stepRepository.findByWorkflowExecutionIdIn(execIds);
        List<ExecutionEvent> allEvents = eventRepository.findByWorkflowExecutionIdIn(execIds);

        Map<UUID, List<StepExecution>> stepsByExecId = allSteps.stream()
                .collect(Collectors.groupingBy(StepExecution::getWorkflowExecutionId));
        Map<UUID, List<ExecutionEvent>> eventsByExecId = allEvents.stream()
                .collect(Collectors.groupingBy(ExecutionEvent::getWorkflowExecutionId));

        List<ExecutionFeatures> featureList = new ArrayList<>();
        for (WorkflowExecution exec : recentExecutions) {
            List<StepExecution> steps = stepsByExecId.getOrDefault(exec.getId(), Collections.emptyList());
            List<ExecutionEvent> events = eventsByExecId.getOrDefault(exec.getId(), Collections.emptyList());
            featureList.add(featureExtractionService.extractFeatures(exec, steps, events, null));
        }

        int sampleSize = featureList.size();
        boolean isSufficient = sampleSize >= minBaselineSamples;

        // 1. Duration stats (only terminal completed/failed executions with duration > 0)
        List<Double> durations = featureList.stream()
                .filter(f -> f.durationMs() > 0)
                .map(f -> (double) f.durationMs())
                .sorted()
                .toList();

        double meanDuration = durations.isEmpty() ? 1500.0 : calculateMean(durations);
        double stdDevDuration = durations.size() > 1 ? calculateStdDev(durations, meanDuration) : 0.0;
        double medianDuration = durations.isEmpty() ? 1200.0 : calculateMedian(durations);
        double iqrDuration = durations.isEmpty() ? 0.0 : calculateIQR(durations);

        // 2. Retry stats
        List<Double> retries = featureList.stream()
                .map(f -> (double) f.retryCount())
                .toList();
        double meanRetries = retries.isEmpty() ? 0.0 : calculateMean(retries);

        // 3. Amount stats (ignoring nulls)
        List<Double> amounts = featureList.stream()
                .map(ExecutionFeatures::orderAmount)
                .filter(Objects::nonNull)
                .sorted()
                .toList();
        double meanAmount = amounts.isEmpty() ? 150.0 : calculateMean(amounts);
        double stdDevAmount = amounts.size() > 1 ? calculateStdDev(amounts, meanAmount) : 0.0;

        // 4. Empirical recovery rate calculation across steps with prior retry attempts
        long retriedStepsCount = allSteps.stream()
                .filter(s -> s.getAttemptCount() > 1)
                .count();
        long recoveredStepsCount = allSteps.stream()
                .filter(s -> s.getAttemptCount() > 1 && s.getStatus() == com.flowguard.enums.StepStatus.COMPLETED)
                .count();
        double empiricalRecoveryRate = retriedStepsCount > 0
                ? (double) recoveredStepsCount / retriedStepsCount
                : 0.0;

        String note = isSufficient
                ? "Statistical baseline established from " + sampleSize + " historical executions."
                : "Insufficient historical baseline data (found " + sampleSize + " runs, minimum required is "
                  + minBaselineSamples + "). Anomaly analysis will not flag duration or payload outliers until baseline stabilizes.";

        return new ExecutionBaseline(
                sampleSize,
                Math.round(meanDuration * 10.0) / 10.0,
                Math.round(stdDevDuration * 10.0) / 10.0,
                Math.round(medianDuration * 10.0) / 10.0,
                Math.round(iqrDuration * 10.0) / 10.0,
                Math.round(meanRetries * 100.0) / 100.0,
                Math.round(meanAmount * 10.0) / 10.0,
                Math.round(stdDevAmount * 10.0) / 10.0,
                (int) retriedStepsCount,
                Math.round(empiricalRecoveryRate * 1000.0) / 1000.0,
                OffsetDateTime.now(),
                note
        );
    }

    private double calculateMean(List<Double> values) {
        return values.stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
    }

    private double calculateStdDev(List<Double> values, double mean) {
        if (values.size() < 2) return 0.0;
        double sumSq = values.stream().mapToDouble(v -> Math.pow(v - mean, 2)).sum();
        return Math.sqrt(sumSq / (values.size() - 1));
    }

    private double calculateMedian(List<Double> sortedValues) {
        if (sortedValues.isEmpty()) return 0.0;
        int n = sortedValues.size();
        if (n % 2 == 1) {
            return sortedValues.get(n / 2);
        } else {
            return (sortedValues.get((n / 2) - 1) + sortedValues.get(n / 2)) / 2.0;
        }
    }

    private double calculateIQR(List<Double> sortedValues) {
        if (sortedValues.size() < 4) return 0.0;
        int n = sortedValues.size();
        double q1 = sortedValues.get(n / 4);
        double q3 = sortedValues.get((3 * n) / 4);
        return Math.max(0.0, q3 - q1);
    }
}
