package com.flowguard.ecommerce.dto;

import com.flowguard.ecommerce.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record OrderDetailsResponse(
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
        String customerNotes,
        List<OrderItemResponse> items,
        List<PaymentResponse> payments,
        List<ShipmentResponse> shipments,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        OffsetDateTime cancelledAt,
        String cancellationReason
) {}
