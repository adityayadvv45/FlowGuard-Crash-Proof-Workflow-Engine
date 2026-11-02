package com.flowguard.ecommerce.adapter;

import java.math.BigDecimal;
import java.util.UUID;

public interface NotificationServiceAdapter {

    record NotificationResult(
            boolean dispatched,
            String channel,
            String dispatchId
    ) {}

    NotificationResult sendOrderConfirmation(UUID orderId, String recipientEmail, BigDecimal orderTotal, String trackingNumber);
}
