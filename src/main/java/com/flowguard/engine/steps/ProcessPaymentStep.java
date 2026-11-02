package com.flowguard.engine.steps;

import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class ProcessPaymentStep implements WorkflowStep {

    public static final String KEY = "PROCESS_PAYMENT";

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Process Payment";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> workflowInput = context.workflowInput();

        // Check for test triggers in input
        if (Boolean.TRUE.equals(workflowInput.get("simulateTransientPaymentFailure")) && context.attemptCount() < 2) {
            return StepResult.retryableFailure("Simulated transient payment gateway timeout (HTTP 504)");
        }

        if (Boolean.TRUE.equals(workflowInput.get("simulatePermanentPaymentFailure"))) {
            return StepResult.permanentFailure("Payment declined: Insufficient funds or invalid card");
        }

        String deterministicKey = context.workflowExecutionId() + "-" + context.stepKey();
        Map<String, Object> output = new HashMap<>();
        output.put("externalIdempotencyKey", deterministicKey);
        output.put("paymentTransactionId", "TXN-" + UUID.nameUUIDFromBytes(deterministicKey.getBytes()).toString().substring(0, 8).toUpperCase());
        output.put("paymentStatus", "SETTLED");
        output.put("amount", workflowInput.getOrDefault("amount", 99.99));
        output.put("processedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
