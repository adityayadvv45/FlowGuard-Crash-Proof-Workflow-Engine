package com.flowguard.ecommerce;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.ecommerce.dto.CreateOrderRequest;
import com.flowguard.ecommerce.dto.CreateProductRequest;
import com.flowguard.ecommerce.dto.OrderItemRequest;
import com.flowguard.ecommerce.dto.ReplenishInventoryRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class EcommerceOrderProcessingIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String TEST_USER_ID = "b0000000-0000-0000-0000-000000000001";
    private static final String SEEDED_PRODUCT_ID = "c0000000-0000-0000-0000-000000000001";

    @Test
    @DisplayName("GET /api/ecommerce/products - should return list of products")
    void shouldListProducts() throws Exception {
        mockMvc.perform(get("/api/ecommerce/products")
                        .param("page", "0")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content", not(empty())));
    }

    @Test
    @DisplayName("GET /api/ecommerce/inventory/{id} - should return inventory levels")
    void shouldGetInventory() throws Exception {
        mockMvc.perform(get("/api/ecommerce/inventory/" + SEEDED_PRODUCT_ID))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.productId").value(SEEDED_PRODUCT_ID))
                .andExpect(jsonPath("$.availableQuantity").isNumber())
                .andExpect(jsonPath("$.reservedQuantity").isNumber())
                .andExpect(jsonPath("$.totalQuantity").isNumber());
    }

    @Test
    @DisplayName("POST /api/ecommerce/orders - should reject unauthorized requests without auth header")
    void shouldRejectUnauthorizedOrderCreation() throws Exception {
        CreateOrderRequest request = new CreateOrderRequest(
                List.of(new OrderItemRequest(UUID.fromString(SEEDED_PRODUCT_ID), 1)),
                "123 Delivery Way",
                null,
                "SIMULATED",
                false,
                false,
                false
        );

        mockMvc.perform(post("/api/ecommerce/orders")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("POST /api/ecommerce/orders - should create order with server-calculated totals")
    void shouldCreateOrderSuccessfully() throws Exception {
        String idemKey = "idem-" + UUID.randomUUID();
        CreateOrderRequest request = new CreateOrderRequest(
                List.of(new OrderItemRequest(UUID.fromString(SEEDED_PRODUCT_ID), 1)),
                "742 Evergreen Terrace, Springfield",
                "Leave at front door",
                "SIMULATED",
                false,
                false,
                false
        );

        mockMvc.perform(post("/api/ecommerce/orders")
                        .header("X-User-Id", TEST_USER_ID)
                        .header("Idempotency-Key", idemKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.orderReference").value(startsWith("ORD-")))
                .andExpect(jsonPath("$.userId").value(TEST_USER_ID))
                .andExpect(jsonPath("$.totalAmount").isNumber())
                .andExpect(jsonPath("$.workflowExecutionId").isNotEmpty());
    }

    @Test
    @DisplayName("POST /api/ecommerce/inventory/{id}/replenish - should replenish inventory stock")
    void shouldReplenishStock() throws Exception {
        ReplenishInventoryRequest request = new ReplenishInventoryRequest(25, "Restock batch");

        mockMvc.perform(post("/api/ecommerce/inventory/" + SEEDED_PRODUCT_ID + "/replenish")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.availableQuantity").isNumber())
                .andExpect(jsonPath("$.totalQuantity").isNumber());
    }
}
