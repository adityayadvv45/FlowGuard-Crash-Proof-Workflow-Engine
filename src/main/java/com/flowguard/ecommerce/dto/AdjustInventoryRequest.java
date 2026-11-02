package com.flowguard.ecommerce.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AdjustInventoryRequest(
        @NotNull(message = "New available quantity is required")
        @Min(value = 0, message = "Available quantity cannot be negative")
        Integer newAvailableQuantity,

        @NotBlank(message = "Audit reason is required for inventory adjustments")
        String reason
) {}
