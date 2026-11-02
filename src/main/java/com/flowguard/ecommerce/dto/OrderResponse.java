package com.flowguard.ecommerce.dto;

import com.flowguard.ecommerce.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record OrderResponse(
        UUID id,
        String orderReference,
        UUID userId,
        UUID workflowExecutionId,
        OrderStatus status,
        BigDecimal subtotal,
        BigDecimal tax,
        BigDecimal shippingFee,
        BigDecimal totalAmount,
        String currency,
        String idempotencyKey,
        String shippingAddress,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime cancelledAt,
        String cancellationReason
) {}
