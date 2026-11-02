package com.flowguard.ecommerce.step;

import com.flowguard.ecommerce.adapter.PaymentGatewayAdapter;
import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.entity.OrderItem;
import com.flowguard.ecommerce.entity.Payment;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.enums.PaymentStatus;
import com.flowguard.ecommerce.repository.OrderItemRepository;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.ecommerce.repository.PaymentRepository;
import com.flowguard.ecommerce.service.InventoryService;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.*;

@Component
public class InitiatePaymentStep implements WorkflowStep {

    private static final Logger log = LoggerFactory.getLogger(InitiatePaymentStep.class);
    public static final String KEY = "INITIATE_PAYMENT";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PaymentRepository paymentRepository;
    private final PaymentGatewayAdapter paymentGateway;
    private final InventoryService inventoryService;

    public InitiatePaymentStep(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            PaymentRepository paymentRepository,
            PaymentGatewayAdapter paymentGateway,
            InventoryService inventoryService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.paymentRepository = paymentRepository;
        this.paymentGateway = paymentGateway;
        this.inventoryService = inventoryService;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Authorize & Settle Payment";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> workflowInput = context.workflowInput();
        String orderIdStr = (String) workflowInput.get("orderId");

        if (orderIdStr == null || orderIdStr.isBlank()) {
            return StepResult.ok(Map.of("status", "SKIPPED_NO_ORDER_ID"));
        }

        UUID orderId;
        try {
            orderId = UUID.fromString(orderIdStr);
        } catch (IllegalArgumentException e) {
            return StepResult.ok(Map.of("status", "SKIPPED_INVALID_ORDER_UUID", "rawOrderId", orderIdStr));
        }

        Optional<Order> orderOpt = orderRepository.findById(orderId);
        if (orderOpt.isEmpty()) {
            return StepResult.permanentFailure("Order not found: " + orderId);
        }

        Order order = orderOpt.get();
        String idempotencyKey = order.getId().toString() + "-PAYMENT";

        // Deduplication check: check if payment record already settled
        Optional<Payment> existingPaymentOpt = paymentRepository.findByOrderIdAndIdempotencyKey(orderId, idempotencyKey);
        if (existingPaymentOpt.isPresent() && existingPaymentOpt.get().getStatus() == PaymentStatus.SETTLED) {
            Payment p = existingPaymentOpt.get();
            log.info("[PAYMENT_DEDUPLICATION] Existing settled payment found: ref={}, txn={}",
                    p.getPaymentReference(), p.getExternalTransactionId());

            return StepResult.ok(Map.of(
                    "paymentId", p.getId().toString(),
                    "paymentReference", p.getPaymentReference(),
                    "externalTransactionId", p.getExternalTransactionId(),
                    "status", "SETTLED"
            ));
        }

        // Test failure injection checks from workflow input
        if (Boolean.TRUE.equals(workflowInput.get("simulateTransientPaymentFailure")) && context.attemptCount() < 2) {
            return StepResult.retryableFailure("Simulated downstream payment gateway 504 timeout on attempt " + context.attemptCount());
        }
        if (Boolean.TRUE.equals(workflowInput.get("simulatePermanentPaymentFailure"))) {
            releaseInventoryOnFailure(orderId);
            order.setStatus(OrderStatus.FAILED);
            order.setUpdatedAt(OffsetDateTime.now());
            orderRepository.save(order);
            return StepResult.permanentFailure("Card declined: Insufficient funds or card expired");
        }

        String paymentRef = "PAY-" + order.getOrderReference();
        BigDecimal amount = order.getTotalAmount();

        PaymentGatewayAdapter.PaymentResult result = paymentGateway.charge(
                orderId,
                paymentRef,
                amount,
                order.getCurrency(),
                idempotencyKey
        );

        Payment payment = existingPaymentOpt.orElseGet(() -> new Payment(
                UUID.randomUUID(),
                orderId,
                paymentRef,
                idempotencyKey,
                amount,
                order.getCurrency(),
                "SIMULATED_GATEWAY",
                OffsetDateTime.now()
        ));

        if (result.successful()) {
            payment.setStatus(PaymentStatus.SETTLED);
            payment.setExternalTransactionId(result.externalTransactionId());
            payment.setSettledAt(OffsetDateTime.now());
            paymentRepository.save(payment);

            order.setStatus(OrderStatus.PAID);
            order.setUpdatedAt(OffsetDateTime.now());
            orderRepository.save(order);

            Map<String, Object> output = new HashMap<>();
            output.put("paymentId", payment.getId().toString());
            output.put("paymentReference", payment.getPaymentReference());
            output.put("externalTransactionId", payment.getExternalTransactionId());
            output.put("amount", payment.getAmount().doubleValue());
            output.put("status", "SETTLED");

            return StepResult.ok(output);
        } else {
            payment.setStatus(PaymentStatus.FAILED);
            payment.setFailureReason(result.failureReason());
            paymentRepository.save(payment);

            releaseInventoryOnFailure(orderId);
            order.setStatus(OrderStatus.FAILED);
            order.setUpdatedAt(OffsetDateTime.now());
            orderRepository.save(order);

            return StepResult.permanentFailure("Payment declined: " + result.failureReason());
        }
    }

    private void releaseInventoryOnFailure(UUID orderId) {
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        for (OrderItem item : items) {
            inventoryService.releaseStock(item.getProductId(), item.getQuantity());
        }
    }
}
