package com.flowguard.engine;

import org.springframework.stereotype.Component;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StepRegistry {

    private final Map<String, WorkflowStep> registry = new ConcurrentHashMap<>();

    public StepRegistry(List<WorkflowStep> steps) {
        if (steps != null) {
            for (WorkflowStep step : steps) {
                registry.put(step.getStepKey(), step);
            }
        }
    }

    public Optional<WorkflowStep> getStep(String stepKey) {
        if (stepKey == null) return Optional.empty();
        return Optional.ofNullable(registry.get(stepKey));
    }

    public boolean isSupported(String stepKey) {
        return stepKey != null && registry.containsKey(stepKey);
    }

    public Set<String> getRegisteredKeys() {
        return Collections.unmodifiableSet(registry.keySet());
    }
}
