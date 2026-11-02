package com.flowguard.engine;

import java.util.Collections;
import java.util.Map;

public record StepResult(
        boolean success,
        Map<String, Object> outputData,
        String errorMessage,
        boolean retryable
) {
    public static StepResult ok(Map<String, Object> outputData) {
        return new StepResult(true, outputData != null ? outputData : Collections.emptyMap(), null, false);
    }

    public static StepResult retryableFailure(String errorMessage) {
        return new StepResult(false, Collections.emptyMap(), errorMessage, true);
    }

    public static StepResult permanentFailure(String errorMessage) {
        return new StepResult(false, Collections.emptyMap(), errorMessage, false);
    }
}
