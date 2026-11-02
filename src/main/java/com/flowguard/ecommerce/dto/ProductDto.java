package com.flowguard.ecommerce.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductDto(
        UUID id,
        String sku,
        String name,
        String description,
        BigDecimal price,
        String currency,
        String category,
        boolean active,
        Integer availableQuantity,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {}
