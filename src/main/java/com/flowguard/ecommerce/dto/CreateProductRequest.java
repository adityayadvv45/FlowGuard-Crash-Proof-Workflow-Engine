package com.flowguard.ecommerce.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;

public record CreateProductRequest(
        @NotBlank(message = "Product SKU is required")
        String sku,

        @NotBlank(message = "Product name is required")
        String name,

        String description,

        @NotNull(message = "Product price is required")
        @DecimalMin(value = "0.00", inclusive = true, message = "Price must be non-negative")
        BigDecimal price,

        String currency,

        @NotBlank(message = "Category is required")
        String category,

        @Min(value = 0, message = "Initial inventory cannot be negative")
        int initialStock
) {}
