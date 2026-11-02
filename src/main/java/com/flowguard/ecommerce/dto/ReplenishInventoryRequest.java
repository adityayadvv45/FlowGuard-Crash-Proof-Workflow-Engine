package com.flowguard.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ReplenishInventoryRequest(
        @NotNull(message = "Quantity is required")
        @Min(value = 1, message = "Replenish quantity must be at least 1")
        Integer quantity,

        String reason
) {}
