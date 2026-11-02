package com.flowguard.ecommerce.step;

import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

/**
 * Workflow step that formally transitions an authorized and paid order to CONFIRMED.
 * Ensures the order reference and timestamp are recorded in the step result.
 */
@Component
public class ConfirmOrderStep implements WorkflowStep {

    private static final Logger log = LoggerFactory.getLogger(ConfirmOrderStep.class);
    public static final String KEY = "CONFIRM_ORDER";

    private final OrderRepository orderRepository;

    public ConfirmOrderStep(OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Confirm Order Status";
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
            return StepResult.permanentFailure("Order not found with ID: " + orderId);
        }

        Order order = orderOpt.get();

        // If order was already cancelled or failed, do not confirm
        if (order.getStatus() == OrderStatus.CANCELLED || order.getStatus() == OrderStatus.FAILED) {
            return StepResult.permanentFailure("Cannot confirm order in terminal status: " + order.getStatus());
        }

        order.setStatus(OrderStatus.CONFIRMED);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        log.info("[CONFIRM_ORDER_STEP] Order confirmed successfully: id={}, reference={}",
                order.getId(), order.getOrderReference());

        Map<String, Object> output = new HashMap<>();
        output.put("orderId", order.getId().toString());
        output.put("orderReference", order.getOrderReference());
        output.put("status", OrderStatus.CONFIRMED.name());
        output.put("confirmedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
