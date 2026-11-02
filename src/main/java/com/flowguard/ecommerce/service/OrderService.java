package com.flowguard.ecommerce.service;

import com.flowguard.dto.ExecutionResponse;
import com.flowguard.dto.StartExecutionRequest;
import com.flowguard.ecommerce.adapter.PaymentGatewayAdapter;
import com.flowguard.ecommerce.dto.*;
import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.entity.OrderItem;
import com.flowguard.ecommerce.entity.Payment;
import com.flowguard.ecommerce.entity.Product;
import com.flowguard.ecommerce.entity.Shipment;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.enums.PaymentStatus;
import com.flowguard.ecommerce.repository.OrderItemRepository;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.ecommerce.repository.PaymentRepository;
import com.flowguard.ecommerce.repository.ProductRepository;
import com.flowguard.ecommerce.repository.ShipmentRepository;
import com.flowguard.exception.AuthException;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.exception.WorkflowException;
import com.flowguard.service.WorkflowExecutionService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
public class OrderService {

    private static final Logger log = LoggerFactory.getLogger(OrderService.class);
    private static final UUID ECOMMERCE_WORKFLOW_ID = UUID.fromString("a0000000-0000-0000-0000-000000000002");
    private static final BigDecimal TAX_RATE = new BigDecimal("0.08"); // 8% tax
    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("200.00");
    private static final BigDecimal STANDARD_SHIPPING_FEE = new BigDecimal("15.00");

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final PaymentRepository paymentRepository;
    private final ShipmentRepository shipmentRepository;
    private final InventoryService inventoryService;
    private final WorkflowExecutionService workflowExecutionService;
    private final PaymentGatewayAdapter paymentGatewayAdapter;

    public OrderService(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ProductRepository productRepository,
            PaymentRepository paymentRepository,
            ShipmentRepository shipmentRepository,
            InventoryService inventoryService,
            WorkflowExecutionService workflowExecutionService,
            PaymentGatewayAdapter paymentGatewayAdapter
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.paymentRepository = paymentRepository;
        this.shipmentRepository = shipmentRepository;
        this.inventoryService = inventoryService;
        this.workflowExecutionService = workflowExecutionService;
        this.paymentGatewayAdapter = paymentGatewayAdapter;
    }

    /**
     * Creates an order with authoritative server-side pricing, persists order and line items,
     * and dispatches the durable 6-step E-commerce workflow execution.
     * Enforces strict idempotency deduplication per user.
     */
    @Transactional
    public OrderDetailsResponse createOrder(UUID userId, CreateOrderRequest request, String idempotencyHeader) {
        String idempotencyKey = (idempotencyHeader != null && !idempotencyHeader.isBlank())
                ? idempotencyHeader.trim()
                : null;

        // Idempotency check: return existing order if previously submitted with identical key
        if (idempotencyKey != null) {
            Optional<Order> existingOrder = orderRepository.findByUserIdAndIdempotencyKey(userId, idempotencyKey);
            if (existingOrder.isPresent()) {
                log.info("[ORDER_IDEMPOTENCY] Reusing existing order {} for idempotency key '{}'",
                        existingOrder.get().getOrderReference(), idempotencyKey);
                return getOrderDetails(existingOrder.get().getId(), userId);
            }
        }

        if (request.items() == null || request.items().isEmpty()) {
            throw new WorkflowException("Order must contain at least one line item");
        }

        OffsetDateTime now = OffsetDateTime.now();
        UUID orderId = UUID.randomUUID();
        String datePrefix = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"));
        String orderRef = "ORD-" + datePrefix + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        BigDecimal subtotal = BigDecimal.ZERO;
        List<OrderItem> orderItems = new ArrayList<>();

        // Validate products and compute authoritative server-side pricing
        for (OrderItemRequest itemReq : request.items()) {
            if (itemReq.quantity() == null || itemReq.quantity() <= 0) {
                throw new WorkflowException("Quantity must be greater than zero for all items");
            }

            Product product = productRepository.findById(itemReq.productId())
                    .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + itemReq.productId()));

            if (!product.isActive()) {
                throw new WorkflowException("Product '" + product.getName() + "' is currently inactive and cannot be ordered");
            }

            BigDecimal unitPrice = product.getPrice();
            BigDecimal itemTotal = unitPrice.multiply(BigDecimal.valueOf(itemReq.quantity())).setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(itemTotal);

            OrderItem orderItem = new OrderItem(
                    UUID.randomUUID(),
                    null, // set below after order instantiation
                    product.getId(),
                    product.getSku(),
                    product.getName(),
                    unitPrice,
                    itemReq.quantity(),
                    itemTotal,
                    now
            );
            orderItems.add(orderItem);
        }

        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal shippingFee = subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : STANDARD_SHIPPING_FEE.setScale(2, RoundingMode.HALF_UP);
        BigDecimal totalAmount = subtotal.add(tax).add(shippingFee).setScale(2, RoundingMode.HALF_UP);

        Order order = new Order(
                orderId,
                orderRef,
                userId,
                idempotencyKey,
                request.shippingAddress(),
                request.customerNotes(),
                now
        );
        order.setSubtotal(subtotal);
        order.setTax(tax);
        order.setShippingFee(shippingFee);
        order.setTotalAmount(totalAmount);
        order.setStatus(OrderStatus.PENDING);

        Order savedOrder = orderRepository.save(order);

        for (OrderItem item : orderItems) {
            item.setOrder(savedOrder);
            orderItemRepository.save(item);
        }

        // Prepare workflow payload and start durable workflow execution
        Map<String, Object> inputData = new HashMap<>();
        inputData.put("orderId", savedOrder.getId().toString());
        inputData.put("orderReference", savedOrder.getOrderReference());
        inputData.put("userId", userId.toString());
        inputData.put("amount", totalAmount.doubleValue());
        if (Boolean.TRUE.equals(request.simulateTransientPaymentFailure())) {
            inputData.put("simulateTransientPaymentFailure", true);
        }
        if (Boolean.TRUE.equals(request.simulatePermanentPaymentFailure())) {
            inputData.put("simulatePermanentPaymentFailure", true);
        }
        if (Boolean.TRUE.equals(request.simulateTransientShippingFailure())) {
            inputData.put("simulateTransientShippingFailure", true);
        }

        String workflowIdempotencyKey = idempotencyKey != null ? "WF-" + idempotencyKey : "WF-" + orderRef;
        StartExecutionRequest execRequest = new StartExecutionRequest(
                inputData,
                workflowIdempotencyKey,
                null,
                null
        );

        ExecutionResponse executionResponse = workflowExecutionService.startExecution(
                ECOMMERCE_WORKFLOW_ID,
                execRequest,
                workflowIdempotencyKey
        );

        savedOrder.setWorkflowExecutionId(executionResponse.id());
        orderRepository.save(savedOrder);

        log.info("[ORDER_SERVICE] Order created and workflow dispatched: orderId={}, orderRef={}, workflowExecutionId={}",
                savedOrder.getId(), savedOrder.getOrderReference(), executionResponse.id());

        return toOrderDetailsResponse(savedOrder, orderItems, Collections.emptyList(), Collections.emptyList());
    }

    /**
     * Retrieves full order details with ownership verification.
     */
    @Transactional(readOnly = true)
    public OrderDetailsResponse getOrderDetails(UUID orderId, UUID userId) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (userId != null && !order.getUserId().equals(userId)) {
            throw new AuthException("Access denied: You do not own order " + orderId);
        }

        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        List<Payment> payments = paymentRepository.findByOrderId(orderId);
        List<Shipment> shipments = shipmentRepository.findByOrderId(orderId);

        return toOrderDetailsResponse(order, items, payments, shipments);
    }

    /**
     * Lists orders for the authenticated user with optional status filter and pagination.
     */
    @Transactional(readOnly = true)
    public Page<OrderResponse> listUserOrders(UUID userId, OrderStatus status, Pageable pageable) {
        return orderRepository.findByUserIdWithFilters(userId, status, pageable)
                .map(this::toOrderResponse);
    }

    /**
     * Cancels an eligible order, releases any reserved stock, refunds payment if settled,
     * and cancels the underlying workflow execution.
     */
    @Transactional
    public OrderDetailsResponse cancelOrder(UUID orderId, UUID userId, String reason) {
        Order order = orderRepository.findById(orderId)
                .orElseThrow(() -> new ResourceNotFoundException("Order not found with ID: " + orderId));

        if (userId != null && !order.getUserId().equals(userId)) {
            throw new AuthException("Access denied: You do not own order " + orderId);
        }

        if (order.getStatus() == OrderStatus.SHIPPED ||
                order.getStatus() == OrderStatus.CANCELLED ||
                order.getStatus() == OrderStatus.FAILED) {
            throw new WorkflowException("Cannot cancel order in status: " + order.getStatus());
        }

        // Release reserved inventory back into available stock
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        for (OrderItem item : items) {
            inventoryService.releaseStock(item.getProductId(), item.getQuantity());
        }

        // Process refund for any settled payment records
        List<Payment> payments = paymentRepository.findByOrderId(orderId);
        for (Payment payment : payments) {
            if (payment.getStatus() == PaymentStatus.SETTLED) {
                paymentGatewayAdapter.refund(orderId, payment.getExternalTransactionId(), payment.getAmount());
                payment.setStatus(PaymentStatus.REFUNDED);
                paymentRepository.save(payment);
            }
        }

        order.setStatus(OrderStatus.CANCELLED);
        order.setCancelledAt(OffsetDateTime.now());
        order.setCancellationReason(reason != null && !reason.isBlank() ? reason : "Cancelled by customer");
        order.setUpdatedAt(OffsetDateTime.now());
        Order updatedOrder = orderRepository.save(order);

        // Cancel associated workflow execution if present
        if (updatedOrder.getWorkflowExecutionId() != null) {
            try {
                workflowExecutionService.cancelExecution(updatedOrder.getWorkflowExecutionId());
            } catch (Exception e) {
                log.warn("[ORDER_SERVICE] Could not cancel workflow execution {}: {}",
                        updatedOrder.getWorkflowExecutionId(), e.getMessage());
            }
        }

        log.info("[ORDER_SERVICE] Order successfully cancelled: orderRef={}, reason='{}'",
                updatedOrder.getOrderReference(), updatedOrder.getCancellationReason());

        List<Shipment> shipments = shipmentRepository.findByOrderId(orderId);
        return toOrderDetailsResponse(updatedOrder, items, payments, shipments);
    }

    public OrderResponse toOrderResponse(Order o) {
        return new OrderResponse(
                o.getId(),
                o.getOrderReference(),
                o.getUserId(),
                o.getWorkflowExecutionId(),
                o.getStatus(),
                o.getSubtotal(),
                o.getTax(),
                o.getShippingFee(),
                o.getTotalAmount(),
                o.getCurrency(),
                o.getIdempotencyKey(),
                o.getShippingAddress(),
                o.getCreatedAt(),
                o.getUpdatedAt(),
                o.getCancelledAt(),
                o.getCancellationReason()
        );
    }

    public OrderDetailsResponse toOrderDetailsResponse(
            Order o,
            List<OrderItem> items,
            List<Payment> payments,
            List<Shipment> shipments
    ) {
        List<OrderItemResponse> itemDtos = items.stream().map(i -> new OrderItemResponse(
                i.getId(),
                i.getProductId(),
                i.getProductSku(),
                i.getProductName(),
                i.getUnitPrice(),
                i.getQuantity(),
                i.getTotalPrice()
        )).toList();

        List<PaymentResponse> paymentDtos = payments.stream().map(p -> new PaymentResponse(
                p.getId(),
                p.getOrderId(),
                p.getPaymentReference(),
                p.getExternalTransactionId(),
                p.getAmount(),
                p.getCurrency(),
                p.getStatus(),
                p.getPaymentMethod(),
                p.getFailureReason(),
                p.getCreatedAt(),
                p.getSettledAt()
        )).toList();

        List<ShipmentResponse> shipmentDtos = shipments.stream().map(s -> new ShipmentResponse(
                s.getId(),
                s.getOrderId(),
                s.getShipmentReference(),
                s.getTrackingNumber(),
                s.getCarrier(),
                s.getStatus(),
                s.getShippingAddress(),
                s.getEstimatedDeliveryAt(),
                s.getCreatedAt(),
                s.getUpdatedAt()
        )).toList();

        return new OrderDetailsResponse(
                o.getId(),
                o.getOrderReference(),
                o.getUserId(),
                o.getWorkflowExecutionId(),
                o.getStatus(),
                o.getSubtotal(),
                o.getTax(),
                o.getShippingFee(),
                o.getTotalAmount(),
                o.getCurrency(),
                o.getIdempotencyKey(),
                o.getShippingAddress(),
                o.getCustomerNotes(),
                itemDtos,
                paymentDtos,
                shipmentDtos,
                o.getCreatedAt(),
                o.getUpdatedAt(),
                o.getCancelledAt(),
                o.getCancellationReason()
        );
    }
}
