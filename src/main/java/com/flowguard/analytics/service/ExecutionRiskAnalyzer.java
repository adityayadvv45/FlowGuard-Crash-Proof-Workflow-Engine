package com.flowguard.analytics.service;

import com.flowguard.analytics.model.ExecutionBaseline;
import com.flowguard.analytics.model.ExecutionFeatures;
import com.flowguard.analytics.model.RiskAssessment;
import com.flowguard.service.RetryService;
import org.springframework.stereotype.Service;

@Service
public class ExecutionRiskAnalyzer {

    private final RetryService retryService;

    public ExecutionRiskAnalyzer(RetryService retryService) {
        this.retryService = retryService;
    }

    public RiskAssessment assessRisk(ExecutionFeatures features, ExecutionBaseline baseline) {
        String err = features.errorMessage() != null ? features.errorMessage().toLowerCase() : "";
        int attempts = Math.max(1, features.totalStepAttempts());
        int maxAttempts = retryService.getMaxAttempts();
        int attemptsRemaining = Math.max(0, maxAttempts - attempts);

        boolean hasCrashed = features.crashCount() > 0;
        boolean hasTimeout = features.timeoutCount() > 0 || err.contains("504") || err.contains("timeout");
        boolean isPermanent = err.contains("declined") || err.contains("insufficient") ||
                              err.contains("invalid") || err.contains("out of stock") ||
                              err.contains("must be greater than zero");

        String errorClassification;
        String retryEligibility;
        String riskLevel;
        String recommendation;
        String basis;

        // Determine error classification & retry eligibility deterministically
        if (isPermanent) {
            errorClassification = "PERMANENT_VALIDATION_OR_DECLINE";
            retryEligibility = "PERMANENT_NON_RETRYABLE";
            riskLevel = "CRITICAL";
            recommendation = "Non-retryable business failure. Immediate operator or customer intervention required. Automated retries will not resolve this issue.";
            basis = "Deterministically classified as non-retryable based on error pattern matching known validation and business rule constraints.";
        } else if (hasTimeout) {
            errorClassification = "TRANSIENT_TIMEOUT";
            if (attemptsRemaining > 0) {
                retryEligibility = "ELIGIBLE_FOR_RETRY";
                riskLevel = attempts > 2 ? "HIGH" : "MEDIUM";
                recommendation = "Transient downstream gateway timeout detected. Safe for automated retry using configured exponential backoff with jitter.";
                basis = "Classified as transient network/gateway timeout. Step has " + attemptsRemaining + " of " + maxAttempts + " attempts remaining under engine policy.";
            } else {
                retryEligibility = "MAX_ATTEMPTS_EXCEEDED";
                riskLevel = "CRITICAL";
                recommendation = "Transient failure exceeded maximum retry attempts (" + maxAttempts + "). Step placed in terminal failure state.";
                basis = "Configured retry attempt ceiling (" + maxAttempts + ") reached.";
            }
        } else if (hasCrashed) {
            errorClassification = "WORKER_CRASH";
            retryEligibility = "LEASE_RECOVERY_PENDING";
            riskLevel = "HIGH";
            recommendation = "Worker process interrupted mid-execution. State is durably preserved in PostgreSQL and eligible for resumption after worker lease expiration.";
            basis = "Detected worker interruption or lease recovery sweep. FlowGuard preserves intermediate state and resumes sequentially from checkpoint.";
        } else if (features.retryCount() > 0) {
            errorClassification = "INTERMITTENT_RETRIES";
            retryEligibility = attemptsRemaining > 0 ? "ELIGIBLE_FOR_RETRY" : "MAX_ATTEMPTS_EXCEEDED";
            riskLevel = attemptsRemaining == 0 ? "HIGH" : "MEDIUM";
            recommendation = "Elevated retry count observed across pipeline steps. Verify downstream service latency.";
            basis = "Observed " + features.retryCount() + " retries across workflow steps.";
        } else {
            errorClassification = "NONE";
            retryEligibility = "NOT_APPLICABLE";
            riskLevel = "LOW";
            recommendation = "Execution parameters within normal operational range. No risk factors detected.";
            basis = "No errors, timeouts, or retries recorded for this execution.";
        }

        // Deterministic delay calculation from engine retry policy
        long recommendedBackoffMs;
        if ("PERMANENT_NON_RETRYABLE".equals(retryEligibility) || "NOT_APPLICABLE".equals(retryEligibility)) {
            recommendedBackoffMs = 0L;
        } else {
            // 2s initial delay with 2.0 multiplier, capped at 30s
            recommendedBackoffMs = Math.min(30_000L, Math.round(2000.0 * Math.pow(2.0, Math.max(0, attempts - 1))));
        }

        // Empirical recovery rate: Only report if sufficient historical evidence exists (at least 5 retried steps)
        Double empiricalRate = null;
        if (baseline != null && baseline.historicalRetriedStepsCount() >= 5) {
            empiricalRate = Math.round(baseline.historicalRecoveryRate() * 1000.0) / 10.0;
        }

        return new RiskAssessment(
                riskLevel,
                retryEligibility,
                errorClassification,
                attemptsRemaining,
                maxAttempts,
                recommendedBackoffMs,
                empiricalRate,
                recommendation,
                basis
        );
    }
}
