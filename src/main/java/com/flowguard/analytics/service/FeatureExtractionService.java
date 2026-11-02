package com.flowguard.analytics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.analytics.model.ExecutionFeatures;
import com.flowguard.entity.ExecutionEvent;
import com.flowguard.entity.StepExecution;
import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.EventType;
import com.flowguard.enums.StepStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.*;

@Service
public class FeatureExtractionService {

    private static final Logger log = LoggerFactory.getLogger(FeatureExtractionService.class);
    private final ObjectMapper objectMapper;

    public FeatureExtractionService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public ExecutionFeatures extractFeatures(
            WorkflowExecution execution,
            List<StepExecution> steps,
            List<ExecutionEvent> events,
            String workflowName
    ) {
        long durationMs = computeDuration(execution.getStartedAt(), execution.getCompletedAt());

        Map<String, Long> stepDurations = new LinkedHashMap<>();
        int totalAttempts = 0;
        int retryCount = 0;
        int failedSteps = 0;

        for (StepExecution step : steps) {
            long stepDur = computeDuration(step.getStartedAt(), step.getCompletedAt());
            stepDurations.put(step.getStepKey(), stepDur);

            int attempts = Math.max(1, step.getAttemptCount());
            totalAttempts += attempts;
            if (attempts > 1) {
                retryCount += (attempts - 1);
            }
            if (step.getStatus() == StepStatus.FAILED) {
                failedSteps++;
            }
        }

        double failureRate = steps.isEmpty() ? 0.0 : (double) failedSteps / steps.size();

        int timeoutCount = 0;
        int crashCount = 0;

        for (ExecutionEvent event : events) {
            if (event.getEventType() == EventType.RECOVERY_PERFORMED ||
                event.getEventType() == EventType.EXECUTION_INTERRUPTED) {
                crashCount++;
            }
            if (event.getEventType() == EventType.RETRY_SCHEDULED ||
                (event.getMessage() != null && (event.getMessage().contains("504") ||
                                                event.getMessage().toLowerCase().contains("timeout")))) {
                timeoutCount++;
            }
        }

        Double amount = parseAmountFromInput(execution.getInputJson());

        return new ExecutionFeatures(
                execution.getId(),
                workflowName != null ? workflowName : "Workflow Execution",
                execution.getStatus(),
                durationMs,
                stepDurations,
                totalAttempts,
                retryCount,
                failureRate,
                timeoutCount,
                crashCount,
                amount,
                execution.getCreatedAt(),
                execution.getErrorMessage()
        );
    }

    private long computeDuration(OffsetDateTime start, OffsetDateTime end) {
        if (start == null) {
            return 0L;
        }
        OffsetDateTime effectiveEnd = end != null ? end : OffsetDateTime.now();
        long millis = Duration.between(start, effectiveEnd).toMillis();
        return Math.max(0L, millis);
    }

    private Double parseAmountFromInput(String inputJson) {
        if (inputJson == null || inputJson.isBlank()) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(inputJson);
            if (root.hasNonNull("amount")) {
                JsonNode amountNode = root.get("amount");
                if (amountNode.isNumber()) {
                    return amountNode.asDouble();
                } else if (amountNode.isTextual()) {
                    return Double.parseDouble(amountNode.asText());
                }
            }
        } catch (Exception e) {
            log.debug("Could not parse amount from inputJson: {}", e.getMessage());
        }
        return null;
    }
}

