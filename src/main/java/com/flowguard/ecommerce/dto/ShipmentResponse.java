package com.flowguard.ecommerce.dto;

import com.flowguard.ecommerce.enums.ShipmentStatus;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ShipmentResponse(
        UUID id,
        UUID orderId,
        String shipmentReference,
        String trackingNumber,
        String carrier,
        ShipmentStatus status,
        String shippingAddress,
        OffsetDateTime estimatedDeliveryAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
