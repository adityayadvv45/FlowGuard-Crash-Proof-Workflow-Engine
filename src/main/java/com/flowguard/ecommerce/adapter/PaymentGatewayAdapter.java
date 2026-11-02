package com.flowguard.ecommerce.adapter;

import java.math.BigDecimal;
import java.util.UUID;

public interface PaymentGatewayAdapter {

    record PaymentResult(
            boolean successful,
            String externalTransactionId,
            String failureReason
    ) {}

    PaymentResult charge(UUID orderId, String paymentReference, BigDecimal amount, String currency, String idempotencyKey);

    PaymentResult refund(UUID orderId, String externalTransactionId, BigDecimal amount);
}
