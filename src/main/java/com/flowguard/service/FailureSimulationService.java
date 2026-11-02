package com.flowguard.service;

import com.flowguard.exception.PermanentStepException;
import com.flowguard.exception.SimulatedCrashException;
import com.flowguard.exception.TransientStepException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class FailureSimulationService {

    private static final Logger log = LoggerFactory.getLogger(FailureSimulationService.class);

    private final boolean allowed;
    private final Map<String, SimulationRule> activeRules = new ConcurrentHashMap<>();

    public FailureSimulationService(@Value("${flowguard.engine.allow-failure-injection:true}") boolean allowed) {
        this.allowed = allowed;
    }

    public record SimulationRule(String stepKey, String mode) {}

    public void registerRule(UUID workflowExecutionId, String stepKey, String mode) {
        if (!allowed) {
            throw new IllegalStateException("Failure simulation is disabled in this environment");
        }
        activeRules.put(workflowExecutionId.toString(), new SimulationRule(stepKey, mode.toUpperCase()));
        log.info("[SIMULATION] Registered rule for executionId={} stepKey={} mode={}", workflowExecutionId, stepKey, mode);
    }

    public void checkAndApplySimulation(UUID workflowExecutionId, String stepKey, int attemptCount) {
        if (!allowed) return;

        SimulationRule rule = activeRules.get(workflowExecutionId.toString());
        if (rule != null && rule.stepKey().equalsIgnoreCase(stepKey)) {
            // Remove rule after firing so subsequent retries can succeed if transient
            if ("TRANSIENT".equalsIgnoreCase(rule.mode())) {
                activeRules.remove(workflowExecutionId.toString());
                log.warn("[SIMULATION] Injecting TRANSIENT error on stepKey={} attempt={}", stepKey, attemptCount);
                throw new TransientStepException("Simulated transient network timeout on " + stepKey + " (attempt " + attemptCount + ")");
            } else if ("CRASH".equalsIgnoreCase(rule.mode())) {
                activeRules.remove(workflowExecutionId.toString());
                log.warn("[SIMULATION] Injecting simulated worker CRASH on stepKey={} attempt={}", stepKey, attemptCount);
                throw new SimulatedCrashException("Simulated worker crash/interruption while processing " + stepKey);
            } else if ("PERMANENT".equalsIgnoreCase(rule.mode())) {
                activeRules.remove(workflowExecutionId.toString());
                log.warn("[SIMULATION] Injecting PERMANENT error on stepKey={}", stepKey);
                throw new PermanentStepException("Simulated fatal business rule violation on " + stepKey);
            }
        }
    }

    public boolean isAllowed() {
        return allowed;
    }
}
