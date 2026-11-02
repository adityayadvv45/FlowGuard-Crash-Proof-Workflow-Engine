package com.flowguard.engine.steps;

import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@Component
public class ValidateOrderStep implements WorkflowStep {

    public static final String KEY = "VALIDATE_ORDER";

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Validate Order";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> input = context.workflowInput();

        // Basic payload validation
        Object amountObj = input.get("amount");
        if (amountObj != null) {
            try {
                double amount = Double.parseDouble(amountObj.toString());
                if (amount <= 0) {
                    return StepResult.permanentFailure("Order amount must be greater than zero, received: " + amount);
                }
            } catch (NumberFormatException e) {
                return StepResult.permanentFailure("Invalid order amount format: " + amountObj);
            }
        }

        String orderId = (String) input.getOrDefault("orderId", "ORD-" + System.currentTimeMillis());
        String customerId = (String) input.getOrDefault("customerId", "CUST-DEFAULT");

        Map<String, Object> output = new HashMap<>();
        output.put("orderId", orderId);
        output.put("customerId", customerId);
        output.put("validationStatus", "PASSED");
        output.put("validatedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
