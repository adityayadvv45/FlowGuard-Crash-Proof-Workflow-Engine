package com.flowguard.engine;

import java.util.Collections;
import java.util.Map;
import java.util.UUID;

public record StepExecutionContext(
        UUID workflowExecutionId,
        UUID stepExecutionId,
        String stepKey,
        int attemptCount,
        Map<String, Object> workflowInput,
        Map<String, Object> stepInput
) {
    public StepExecutionContext {
        if (workflowInput == null) workflowInput = Collections.emptyMap();
        if (stepInput == null) stepInput = Collections.emptyMap();
    }
}
