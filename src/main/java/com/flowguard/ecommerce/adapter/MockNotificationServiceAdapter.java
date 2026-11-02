package com.flowguard.ecommerce.adapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Sandbox/Mock notification adapter for email/SMS order confirmations.
 */
@Component
public class MockNotificationServiceAdapter implements NotificationServiceAdapter {

    private static final Logger log = LoggerFactory.getLogger(MockNotificationServiceAdapter.class);

    @Override
    public NotificationResult sendOrderConfirmation(UUID orderId, String recipientEmail, BigDecimal orderTotal, String trackingNumber) {
        String dispatchId = "NOTIF-MOCK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        log.info("[MOCK_NOTIFICATION] Order confirmation dispatched: orderId={}, email={}, total={}, tracking={}, dispatchId={}",
                orderId, recipientEmail, orderTotal, trackingNumber, dispatchId);

        return new NotificationResult(true, "EMAIL_SIMULATED", dispatchId);
    }
}
