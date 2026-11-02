package com.flowguard.ecommerce.dto;

import com.flowguard.ecommerce.enums.PaymentStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PaymentResponse(
        UUID id,
        UUID orderId,
        String paymentReference,
        String externalTransactionId,
        BigDecimal amount,
        String currency,
        PaymentStatus status,
        String paymentMethod,
        String failureReason,
        OffsetDateTime createdAt,
        OffsetDateTime settledAt
) {}
