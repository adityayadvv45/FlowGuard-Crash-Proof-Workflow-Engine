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
public class SendNotificationStep implements WorkflowStep {

    public static final String KEY = "SEND_NOTIFICATION";

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
        Map<String, Object> output = new HashMap<>();
        output.put("notificationId", "NOTIF-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        output.put("channel", "EMAIL");
        output.put("dispatchStatus", "SENT");
        output.put("sentAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
