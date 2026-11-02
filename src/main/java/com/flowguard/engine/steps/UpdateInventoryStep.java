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
public class UpdateInventoryStep implements WorkflowStep {

    public static final String KEY = "UPDATE_INVENTORY";

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Update Inventory";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> workflowInput = context.workflowInput();

        if (Boolean.TRUE.equals(workflowInput.get("simulateInventoryOutOfStock"))) {
            return StepResult.permanentFailure("Inventory stock allocation failed: Item out of stock");
        }

        Map<String, Object> output = new HashMap<>();
        output.put("reservationId", "RES-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        output.put("warehouseLocation", "WH-EAST-1");
        output.put("inventoryStatus", "RESERVED");
        output.put("reservedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
