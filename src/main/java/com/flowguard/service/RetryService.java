package com.flowguard.service;

import com.flowguard.entity.StepExecution;
import com.flowguard.enums.EventType;
import com.flowguard.enums.StepStatus;
import com.flowguard.repository.StepExecutionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.concurrent.ThreadLocalRandom;

@Service
public class RetryService {

    private static final Logger log = LoggerFactory.getLogger(RetryService.class);

    private final int maxAttempts;
    private final long initialDelaySeconds;
    private final double multiplier;
    private final long maxDelaySeconds;
    private final double jitterFactor;

    private final StepExecutionRepository stepRepository;
    private final ExecutionEventRecorder eventRecorder;
    private final com.flowguard.metrics.FlowGuardMetricsService metricsService;

    public RetryService(
            @Value("${flowguard.engine.retry.max-attempts:3}") int maxAttempts,
            @Value("${flowguard.engine.retry.initial-delay-seconds:2}") long initialDelaySeconds,
            @Value("${flowguard.engine.retry.multiplier:2.0}") double multiplier,
            @Value("${flowguard.engine.retry.max-delay-seconds:30}") long maxDelaySeconds,
            @Value("${flowguard.engine.retry.jitter-factor:0.2}") double jitterFactor,
            StepExecutionRepository stepRepository,
            ExecutionEventRecorder eventRecorder,
            @org.springframework.beans.factory.annotation.Autowired(required = false) com.flowguard.metrics.FlowGuardMetricsService metricsService
    ) {
        this.maxAttempts = maxAttempts;
        this.initialDelaySeconds = initialDelaySeconds;
        this.multiplier = multiplier;
        this.maxDelaySeconds = maxDelaySeconds;
        this.jitterFactor = jitterFactor;
        this.stepRepository = stepRepository;
        this.eventRecorder = eventRecorder;
        this.metricsService = metricsService;
    }

    public boolean canRetry(int currentAttempt) {
        return currentAttempt < maxAttempts;
    }

    public int getMaxAttempts() {
        return maxAttempts;
    }

    public OffsetDateTime calculateNextRetry(int attemptCount) {
        // attemptCount is 1-based (after initial attempt failure, attemptCount = 1)
        double exponentialDelay = initialDelaySeconds * Math.pow(multiplier, Math.max(0, attemptCount - 1));
        double boundedDelay = Math.min(exponentialDelay, maxDelaySeconds);

        // Apply jitter: +/- jitterFactor
        double jitterRange = boundedDelay * jitterFactor;
        double jitter = 0.0;
        if (jitterRange > 0.0001) {
            jitter = ThreadLocalRandom.current().nextDouble(-jitterRange, jitterRange);
        }
        long finalDelaySeconds = Math.max(1, Math.round(boundedDelay + jitter));

        return OffsetDateTime.now().plusSeconds(finalDelaySeconds);
    }

    @Transactional
    public void scheduleRetry(StepExecution step, String errorMessage) {
        OffsetDateTime nextRetry = calculateNextRetry(step.getAttemptCount());
        step.setStatus(StepStatus.RETRY_WAIT);
        step.setErrorMessage(errorMessage);
        step.setNextRetryAt(nextRetry);
        step.setWorkerLeaseOwner(null);
        step.setWorkerLeaseUntil(null);
        stepRepository.save(step);

        String details = String.format("{\"attempt\":%d,\"maxAttempts\":%d,\"nextRetryAt\":\"%s\"}",
                step.getAttemptCount(), maxAttempts, nextRetry);
        eventRecorder.recordEvent(
                step.getWorkflowExecutionId(),
                step.getId(),
                EventType.RETRY_SCHEDULED,
                "Retry scheduled for step '" + step.getStepName() + "' (attempt " + step.getAttemptCount() + "/" + maxAttempts + ") at " + nextRetry,
                details
        );
        if (metricsService != null) {
            metricsService.recordRetryScheduled();
        }
        log.info("[RETRY] Scheduled retry for stepId={} attempt={} nextRetry={}", step.getId(), step.getAttemptCount(), nextRetry);
    }
}
