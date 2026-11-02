package com.flowguard.ecommerce.step;

import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.entity.OrderItem;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.repository.OrderItemRepository;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.ecommerce.service.InventoryService;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.*;

@Component
public class ReserveInventoryStep implements WorkflowStep {

    private static final Logger log = LoggerFactory.getLogger(ReserveInventoryStep.class);
    public static final String KEY = "RESERVE_INVENTORY";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final InventoryService inventoryService;

    public ReserveInventoryStep(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            InventoryService inventoryService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.inventoryService = inventoryService;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Reserve Inventory Stock";
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
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        if (items.isEmpty()) {
            return StepResult.permanentFailure("Order " + order.getOrderReference() + " has no line items to reserve");
        }

        List<OrderItem> successfullyReserved = new ArrayList<>();
        for (OrderItem item : items) {
            boolean reserved = inventoryService.reserveStock(item.getProductId(), item.getQuantity());
            if (!reserved) {
                // Roll back any previously reserved items in this order
                for (OrderItem previous : successfullyReserved) {
                    inventoryService.releaseStock(previous.getProductId(), previous.getQuantity());
                }

                order.setStatus(OrderStatus.FAILED);
                order.setUpdatedAt(OffsetDateTime.now());
                orderRepository.save(order);

                return StepResult.permanentFailure("Insufficient stock for product '" + item.getProductName() +
                        "' (SKU: " + item.getProductSku() + "). Requested: " + item.getQuantity());
            }
            successfullyReserved.add(item);
        }

        order.setStatus(OrderStatus.INVENTORY_RESERVED);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        Map<String, Object> output = new HashMap<>();
        output.put("orderId", order.getId().toString());
        output.put("orderReference", order.getOrderReference());
        output.put("itemsReservedCount", items.size());
        output.put("reservedAt", OffsetDateTime.now().toString());

        return StepResult.ok(output);
    }
}
