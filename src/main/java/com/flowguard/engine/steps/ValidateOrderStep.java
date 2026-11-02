package com.flowguard.engine.steps;

import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class ValidateOrderStep implements WorkflowStep {

    public static final String KEY = "VALIDATE_ORDER";

    private final OrderRepository orderRepository;

    public ValidateOrderStep(@Autowired(required = false) OrderRepository orderRepository) {
        this.orderRepository = orderRepository;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Validate Order";
    }

    @Override
    public StepResult execute(StepExecutionContext context) {
        Map<String, Object> input = context.workflowInput();

        // Basic payload validation
        Object amountObj = input.get("amount");
        if (amountObj != null) {
            try {
                double amount = Double.parseDouble(amountObj.toString());
                if (amount <= 0) {
                    return StepResult.permanentFailure("Order amount must be greater than zero, received: " + amount);
                }
            } catch (NumberFormatException e) {
                return StepResult.permanentFailure("Invalid order amount format: " + amountObj);
            }
        }

        String orderIdStr = (String) input.get("orderId");
        String customerId = (String) input.getOrDefault("customerId", "CUST-DEFAULT");

        if (orderIdStr != null && orderRepository != null) {
            try {
                UUID orderId = UUID.fromString(orderIdStr);
                Optional<Order> orderOpt = orderRepository.findById(orderId);
                if (orderOpt.isPresent()) {
                    Order order = orderOpt.get();
                    if (order.getStatus() == OrderStatus.PENDING) {
                        order.setStatus(OrderStatus.VALIDATED);
                        order.setUpdatedAt(OffsetDateTime.now());
                        orderRepository.save(order);
                    }
                }
            } catch (IllegalArgumentException ignored) {
                // Not a UUID, fallback to standard mock flow
            }
        }

        String orderId = orderIdStr != null ? orderIdStr : "ORD-" + System.currentTimeMillis();

        Map<String, Object> output = new HashMap<>();
        output.put("orderId", orderId);
        output.put("customerId", customerId);
        output.put("validationStatus", "PASSED");
        output.put("validatedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
