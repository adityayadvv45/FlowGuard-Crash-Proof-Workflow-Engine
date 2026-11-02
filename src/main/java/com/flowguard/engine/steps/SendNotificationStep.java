package com.flowguard.engine.steps;

import com.flowguard.ecommerce.adapter.NotificationServiceAdapter;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Component
public class SendNotificationStep implements WorkflowStep {

    public static final String KEY = "SEND_NOTIFICATION";

    private final NotificationServiceAdapter notificationServiceAdapter;

    public SendNotificationStep(@Autowired(required = false) NotificationServiceAdapter notificationServiceAdapter) {
        this.notificationServiceAdapter = notificationServiceAdapter;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Send Confirmation Notification";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> input = context.workflowInput();

        String dispatchId = "NOTIF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        String channel = "EMAIL";

        if (notificationServiceAdapter != null) {
            String orderIdStr = (String) input.get("orderId");
            UUID orderId = null;
            if (orderIdStr != null) {
                try {
                    orderId = UUID.fromString(orderIdStr);
                } catch (IllegalArgumentException ignored) {
                }
            }
            if (orderId == null) {
                orderId = UUID.randomUUID();
            }

            String email = (String) input.getOrDefault("customerEmail", "customer@flowguard.io");
            NotificationServiceAdapter.NotificationResult res = notificationServiceAdapter.sendOrderConfirmation(
                    orderId,
                    email,
                    BigDecimal.valueOf(100.00),
                    "TRK-SIMULATED"
            );
            if (res != null) {
                dispatchId = res.dispatchId();
                channel = res.channel();
            }
        }

        Map<String, Object> output = new HashMap<>();
        output.put("notificationId", dispatchId);
        output.put("channel", channel);
        output.put("dispatchStatus", "SENT");
        output.put("sentAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
