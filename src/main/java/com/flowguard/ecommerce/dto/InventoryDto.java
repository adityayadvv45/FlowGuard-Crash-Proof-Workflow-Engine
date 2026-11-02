package com.flowguard.ecommerce.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record InventoryDto(
        UUID id,
        UUID productId,
        String productSku,
        String productName,
        int availableQuantity,
        int reservedQuantity,
        int totalQuantity,
        Long version,
        OffsetDateTime updatedAt
) {}
