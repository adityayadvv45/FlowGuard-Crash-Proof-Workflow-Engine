package com.flowguard.ecommerce.dto;

import jakarta.validation.constraints.DecimalMin;
import java.math.BigDecimal;

public record UpdateProductRequest(
        String name,
        String description,
        @DecimalMin(value = "0.00", inclusive = true, message = "Price must be non-negative")
        BigDecimal price,
        String category,
        Boolean active
) {}
