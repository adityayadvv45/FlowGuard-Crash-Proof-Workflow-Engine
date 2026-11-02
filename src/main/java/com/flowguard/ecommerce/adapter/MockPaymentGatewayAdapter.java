package com.flowguard.ecommerce.adapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Sandbox/Mock payment gateway adapter for development and testing.
 * Replaces live payment provider (e.g. Stripe/Adyen) while strictly maintaining
 * idempotency token boundaries and failure simulation contracts.
 */
@Component
public class MockPaymentGatewayAdapter implements PaymentGatewayAdapter {

    private static final Logger log = LoggerFactory.getLogger(MockPaymentGatewayAdapter.class);

    @Override
    public PaymentResult charge(UUID orderId, String paymentReference, BigDecimal amount, String currency, String idempotencyKey) {
        log.info("[MOCK_PAYMENT_GATEWAY] Processing charge: orderId={}, amount={} {}, idempotencyKey={}",
                orderId, amount, currency, idempotencyKey);

        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            return new PaymentResult(false, null, "Invalid charge amount: must be positive");
        }

        // Deterministic transaction ID derived from idempotency token
        String txnId = "TXN-GW-" + UUID.nameUUIDFromBytes((idempotencyKey != null ? idempotencyKey : paymentReference).getBytes())
                .toString().substring(0, 12).toUpperCase();

        log.info("[MOCK_PAYMENT_GATEWAY] Charge settled successfully: txnId={}", txnId);
        return new PaymentResult(true, txnId, null);
    }

    @Override
    public PaymentResult refund(UUID orderId, String externalTransactionId, BigDecimal amount) {
        log.info("[MOCK_PAYMENT_GATEWAY] Processing refund: orderId={}, txnId={}, amount={}",
                orderId, externalTransactionId, amount);
        String refundTxn = "REF-GW-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        return new PaymentResult(true, refundTxn, null);
    }
}
