package com.flowguard.ecommerce.step;

import com.flowguard.ecommerce.adapter.ShippingCarrierAdapter;
import com.flowguard.ecommerce.entity.Order;
import com.flowguard.ecommerce.entity.OrderItem;
import com.flowguard.ecommerce.entity.Shipment;
import com.flowguard.ecommerce.enums.OrderStatus;
import com.flowguard.ecommerce.enums.ShipmentStatus;
import com.flowguard.ecommerce.repository.OrderItemRepository;
import com.flowguard.ecommerce.repository.OrderRepository;
import com.flowguard.ecommerce.repository.ShipmentRepository;
import com.flowguard.ecommerce.service.InventoryService;
import com.flowguard.engine.StepExecutionContext;
import com.flowguard.engine.StepResult;
import com.flowguard.engine.WorkflowStep;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.*;

/**
 * Workflow step that prepares shipping labels with the logistics carrier,
 * permanently deducts reserved inventory stock, records the shipment,
 * and updates the order status to SHIPPED.
 */
@Component
public class PrepareShipmentStep implements WorkflowStep {

    private static final Logger log = LoggerFactory.getLogger(PrepareShipmentStep.class);
    public static final String KEY = "PREPARE_SHIPMENT";

    private final OrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ShipmentRepository shipmentRepository;
    private final ShippingCarrierAdapter shippingCarrier;
    private final InventoryService inventoryService;

    public PrepareShipmentStep(
            OrderRepository orderRepository,
            OrderItemRepository orderItemRepository,
            ShipmentRepository shipmentRepository,
            ShippingCarrierAdapter shippingCarrier,
            InventoryService inventoryService
    ) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.shipmentRepository = shipmentRepository;
        this.shippingCarrier = shippingCarrier;
        this.inventoryService = inventoryService;
    }

    @Override
    public String getStepKey() {
        return KEY;
    }

    @Override
    public String getDefaultName() {
        return "Prepare Shipping Label";
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

        // Idempotency check: see if shipment already prepared
        List<Shipment> existingShipments = shipmentRepository.findByOrderId(orderId);
        if (!existingShipments.isEmpty()) {
            Shipment existing = existingShipments.get(0);
            log.info("[SHIPMENT_DEDUPLICATION] Existing shipment found: id={}, ref={}, tracking={}",
                    existing.getId(), existing.getShipmentReference(), existing.getTrackingNumber());

            return StepResult.ok(Map.of(
                    "shipmentId", existing.getId().toString(),
                    "shipmentReference", existing.getShipmentReference(),
                    "trackingNumber", existing.getTrackingNumber() != null ? existing.getTrackingNumber() : "N/A",
                    "carrier", existing.getCarrier(),
                    "status", existing.getStatus().name()
            ));
        }

        // Test failure injection checks from workflow input
        if (Boolean.TRUE.equals(workflowInput.get("simulateTransientShippingFailure")) && context.attemptCount() < 2) {
            return StepResult.retryableFailure("Carrier API connection timeout on attempt " + context.attemptCount());
        }

        // Deduct reserved stock permanently since the shipment is now being generated
        List<OrderItem> items = orderItemRepository.findByOrderId(orderId);
        for (OrderItem item : items) {
            inventoryService.deductReservedStock(item.getProductId(), item.getQuantity());
        }

        String shipmentRef = "SHIP-" + order.getOrderReference();
        ShippingCarrierAdapter.ShippingResult carrierResult = shippingCarrier.createShipment(
                order.getId(),
                shipmentRef,
                order.getShippingAddress()
        );

        if (!carrierResult.successful()) {
            return StepResult.retryableFailure("Carrier failed to generate label: " + carrierResult.failureReason());
        }

        Shipment shipment = new Shipment(
                UUID.randomUUID(),
                order.getId(),
                shipmentRef,
                order.getShippingAddress(),
                carrierResult.carrierName(),
                OffsetDateTime.now()
        );
        shipment.setTrackingNumber(carrierResult.trackingNumber());
        shipment.setStatus(ShipmentStatus.PREPARED);
        shipment.setEstimatedDeliveryAt(OffsetDateTime.now().plusDays(3));
        shipmentRepository.save(shipment);

        order.setStatus(OrderStatus.SHIPPED);
        order.setUpdatedAt(OffsetDateTime.now());
        orderRepository.save(order);

        log.info("[PREPARE_SHIPMENT_STEP] Shipment prepared successfully: tracking={}, carrier={}",
                carrierResult.trackingNumber(), carrierResult.carrierName());

        Map<String, Object> output = new HashMap<>();
        output.put("shipmentId", shipment.getId().toString());
        output.put("shipmentReference", shipment.getShipmentReference());
        output.put("trackingNumber", shipment.getTrackingNumber());
        output.put("carrier", shipment.getCarrier());
        output.put("status", shipment.getStatus().name());
        output.put("estimatedDeliveryAt", shipment.getEstimatedDeliveryAt().toString());

        return StepResult.ok(output);
    }
}
