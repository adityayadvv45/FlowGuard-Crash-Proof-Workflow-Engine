package com.flowguard.ecommerce.controller;

import com.flowguard.auth.service.AuthService;
import com.flowguard.ecommerce.dto.CreateOrderRequest;
import com.flowguard.ecommerce.dto.OrderDetailsResponse;
import com.flowguard.ecommerce.dto.OrderResponse;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.service.OrderService;
import com.flowguard.exception.AuthException;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/ecommerce/orders")
public class OrderController {

    private final OrderService orderService;
    private final AuthService authService;

    public OrderController(OrderService orderService, AuthService authService) {
        this.orderService = orderService;
        this.authService = authService;
    }

    /**
     * Creates an order for the authenticated user, calculates server-side totals,
     * and dispatches the durable 6-step workflow execution.
     */
    @PostMapping
    public ResponseEntity<OrderDetailsResponse> createOrder(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestHeader(value = "Idempotency-Key", required = false) String idempotencyKey,
            @Valid @RequestBody CreateOrderRequest request
    ) {
        UUID userId = resolveUserId(authHeader, xUserId);
        OrderDetailsResponse created = orderService.createOrder(userId, request, idempotencyKey);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Retrieves complete order details including line items, payments, and shipments.
     * Enforces tenant ownership isolation.
     */
    @GetMapping("/{id}")
    public ResponseEntity<OrderDetailsResponse> getOrderDetails(
            @PathVariable UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId
    ) {
        UUID userId = resolveUserId(authHeader, xUserId);
        return ResponseEntity.ok(orderService.getOrderDetails(id, userId));
    }

    /**
     * Lists orders belonging to the authenticated user with optional status filter and pagination.
     */
    @GetMapping
    public ResponseEntity<Page<OrderResponse>> listOrders(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestParam(required = false) OrderStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        UUID userId = resolveUserId(authHeader, xUserId);
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.min(100, Math.max(1, size)), Sort.by("createdAt").descending());
        return ResponseEntity.ok(orderService.listUserOrders(userId, status, pageable));
    }

    /**
     * Cancels an order, releases reserved inventory back to available stock,
     * refunds settled payments, and halts the workflow execution.
     */
    @PostMapping("/{id}/cancel")
    public ResponseEntity<OrderDetailsResponse> cancelOrder(
            @PathVariable UUID id,
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @RequestHeader(value = "X-User-Id", required = false) String xUserId,
            @RequestBody(required = false) Map<String, String> body
    ) {
        UUID userId = resolveUserId(authHeader, xUserId);
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(orderService.cancelOrder(id, userId, reason));
    }

    private UUID resolveUserId(String authHeader, String xUserId) {
        if (authHeader != null && !authHeader.isBlank()) {
            return authService.getCurrentUser(authHeader).id();
        }
        if (xUserId != null && !xUserId.isBlank()) {
            try {
                return UUID.fromString(xUserId.trim());
            } catch (IllegalArgumentException e) {
                throw new AuthException("Invalid X-User-Id format: " + xUserId);
            }
        }
        throw new AuthException("Missing Authorization header. Please log in.");
    }
}
