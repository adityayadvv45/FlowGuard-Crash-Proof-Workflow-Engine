package com.flowguard.ecommerce;

import com.flowguard.dto.ExecutionResponse;
import com.flowguard.dto.StartExecutionRequest;
import com.flowguard.ecommerce.adapter.PaymentGatewayAdapter;
import com.flowguard.ecommerce.dto.CreateOrderRequest;
import com.flowguard.ecommerce.dto.OrderDetailsResponse;
import com.flowguard.ecommerce.dto.OrderItemRequest;
import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.entity.OrderItem;
import com.flowguard.ecommerce.entity.Payment;
import com.flowguard.ecommerce.entity.Product;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.enums.PaymentStatus;
import com.flowguard.ecommerce.repository.*;
import com.flowguard.ecommerce.service.InventoryService;
import com.flowguard.ecommerce.service.OrderService;
import com.flowguard.enums.WorkflowStatus;
import com.flowguard.exception.AuthException;
import com.flowguard.exception.WorkflowException;
import com.flowguard.service.WorkflowExecutionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class EcommerceOrderProcessingUnitTest {

    @Mock
    private OrderRepository orderRepository;

    @Mock
    private OrderItemRepository orderItemRepository;

    @Mock
    private ProductRepository productRepository;

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private ShipmentRepository shipmentRepository;

    @Mock
    private InventoryService inventoryService;

    @Mock
    private WorkflowExecutionService workflowExecutionService;

    @Mock
    private PaymentGatewayAdapter paymentGatewayAdapter;

    private OrderService orderService;

    private final UUID userId = UUID.fromString("b0000000-0000-0000-0000-000000000001");
    private final UUID otherUserId = UUID.fromString("b0000000-0000-0000-0000-000000000002");
    private final UUID productId = UUID.fromString("c0000000-0000-0000-0000-000000000001");

    @BeforeEach
    void setUp() {
        orderService = new OrderService(
                orderRepository,
                orderItemRepository,
                productRepository,
                paymentRepository,
                shipmentRepository,
                inventoryService,
                workflowExecutionService,
                paymentGatewayAdapter
        );
    }

    @Test
    @DisplayName("Should calculate authoritative pricing server-side and dispatch workflow execution")
    void shouldCalculateAuthoritativePricingAndDispatchWorkflow() {
        Product mockProduct = new Product(
                productId,
                "LAPTOP-MBP-14",
                "MacBook Pro 14",
                "Apple M3",
                new BigDecimal("1000.00"),
                "USD",
                "Computers",
                true,
                OffsetDateTime.now(),
                OffsetDateTime.now()
        );

        when(productRepository.findById(productId)).thenReturn(Optional.of(mockProduct));
        when(orderRepository.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UUID workflowExecId = UUID.randomUUID();
        when(workflowExecutionService.startExecution(any(UUID.class), any(StartExecutionRequest.class), anyString()))
                .thenReturn(new ExecutionResponse(
                        workflowExecId,
                        UUID.randomUUID(),
                        "E-Commerce Order Fulfillment Pipeline",
                        1,
                        WorkflowStatus.RUNNING,
                        "worker-1",
                        OffsetDateTime.now().plusSeconds(30),
                        null,
                        OffsetDateTime.now(),
                        null,
                        null,
                        Collections.emptyList()
                ));

        CreateOrderRequest request = new CreateOrderRequest(
                List.of(new OrderItemRequest(productId, 2)),
                "123 Tech Boulevard, Silicon Valley, CA",
                "Leave at front porch",
                "CREDIT_CARD",
                false,
                false,
                false
        );

        OrderDetailsResponse response = orderService.createOrder(userId, request, "test-idem-key-100");

        assertNotNull(response);
        assertEquals(userId, response.userId());
        assertEquals(OrderStatus.PENDING, response.status());

        // Subtotal = 2 * 1000 = 2000.00
        assertEquals(new BigDecimal("2000.00"), response.subtotal());
        // Tax = 8% of 2000 = 160.00
        assertEquals(new BigDecimal("160.00"), response.tax());
        // Free shipping threshold >= 200 => shippingFee = 0.00
        assertEquals(new BigDecimal("0.00"), response.shippingFee());
        // Total = 2000 + 160 + 0 = 2160.00
        assertEquals(new BigDecimal("2160.00"), response.totalAmount());

        // Verify workflow dispatched with orderId and authoritative total
        ArgumentCaptor<StartExecutionRequest> execCaptor = ArgumentCaptor.forClass(StartExecutionRequest.class);
        verify(workflowExecutionService).startExecution(any(UUID.class), execCaptor.capture(), eq("WF-test-idem-key-100"));
        Map<String, Object> inputData = execCaptor.getValue().inputData();
        assertEquals(2160.0, (Double) inputData.get("amount"), 0.01);
    }

    @Test
    @DisplayName("Should return existing order idempotently when same idempotency key is submitted")
    void shouldReturnExistingOrderOnIdempotencyConflict() {
        String idemKey = "duplicate-checkout-token-abc";
        Order existing = new Order(
                UUID.randomUUID(),
                "ORD-20261102-EXISTING",
                userId,
                idemKey,
                "456 Main St",
                null,
                OffsetDateTime.now()
        );
        existing.setStatus(OrderStatus.CONFIRMED);

        when(orderRepository.findByUserIdAndIdempotencyKey(userId, idemKey)).thenReturn(Optional.of(existing));
        when(orderRepository.findById(existing.getId())).thenReturn(Optional.of(existing));

        CreateOrderRequest request = new CreateOrderRequest(
                List.of(new OrderItemRequest(productId, 1)),
                "456 Main St",
                null,
                "CARD",
                false,
                false,
                false
        );

        OrderDetailsResponse response = orderService.createOrder(userId, request, idemKey);

        assertNotNull(response);
        assertEquals(existing.getId(), response.id());
        assertEquals("ORD-20261102-EXISTING", response.orderReference());
        verify(orderRepository, never()).save(any(Order.class));
        verify(workflowExecutionService, never()).startExecution(any(), any(), any());
    }

    @Test
    @DisplayName("Should enforce tenant ownership isolation on order access")
    void shouldEnforceTenantOwnership() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order(
                orderId,
                "ORD-TENANT-CHECK",
                otherUserId, // belongs to user B
                null,
                "Secret Location",
                null,
                OffsetDateTime.now()
        );

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        // User A tries to view User B's order
        assertThrows(AuthException.class, () -> orderService.getOrderDetails(orderId, userId));
    }

    @Test
    @DisplayName("Should cancel eligible order, release inventory stock, and process refund")
    void shouldCancelOrderAndReleaseInventory() {
        UUID orderId = UUID.randomUUID();
        UUID executionId = UUID.randomUUID();
        Order order = new Order(
                orderId,
                "ORD-CANCEL-ME",
                userId,
                null,
                "789 Oak Ave",
                null,
                OffsetDateTime.now()
        );
        order.setStatus(OrderStatus.CONFIRMED);
        order.setWorkflowExecutionId(executionId);

        OrderItem item = new OrderItem(
                UUID.randomUUID(),
                order,
                productId,
                "SKU-1",
                "Product 1",
                new BigDecimal("100.00"),
                3,
                new BigDecimal("300.00"),
                OffsetDateTime.now()
        );

        Payment payment = new Payment(
                UUID.randomUUID(),
                orderId,
                "PAY-REF-1",
                "IDEM-1",
                new BigDecimal("300.00"),
                "USD",
                "GATEWAY",
                OffsetDateTime.now()
        );
        payment.setStatus(PaymentStatus.SETTLED);
        payment.setExternalTransactionId("TXN-EXT-1");

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));
        when(orderItemRepository.findByOrderId(orderId)).thenReturn(List.of(item));
        when(paymentRepository.findByOrderId(orderId)).thenReturn(List.of(payment));
        when(orderRepository.save(any(Order.class))).thenAnswer(i -> i.getArgument(0));

        OrderDetailsResponse response = orderService.cancelOrder(orderId, userId, "Customer changed mind");

        assertNotNull(response);
        assertEquals(OrderStatus.CANCELLED, response.status());
        assertNotNull(response.cancelledAt());
        assertEquals("Customer changed mind", response.cancellationReason());

        // Verify stock released back to available
        verify(inventoryService).releaseStock(productId, 3);

        // Verify payment refunded
        verify(paymentGatewayAdapter).refund(orderId, "TXN-EXT-1", new BigDecimal("300.00"));
        assertEquals(PaymentStatus.REFUNDED, payment.getStatus());

        // Verify workflow cancelled
        verify(workflowExecutionService).cancelExecution(executionId);
    }

    @Test
    @DisplayName("Should reject order cancellation for already shipped or failed orders")
    void shouldRejectCancellationForShippedOrders() {
        UUID orderId = UUID.randomUUID();
        Order order = new Order(
                orderId,
                "ORD-SHIPPED",
                userId,
                null,
                "Destination",
                null,
                OffsetDateTime.now()
        );
        order.setStatus(OrderStatus.SHIPPED);

        when(orderRepository.findById(orderId)).thenReturn(Optional.of(order));

        assertThrows(WorkflowException.class, () -> orderService.cancelOrder(orderId, userId, "Too late"));
    }
}
