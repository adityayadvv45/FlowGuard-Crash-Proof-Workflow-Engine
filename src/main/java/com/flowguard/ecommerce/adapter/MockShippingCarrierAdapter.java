package com.flowguard.ecommerce.adapter;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Sandbox/Mock shipping carrier adapter for development and testing.
 * Simulates external logistics label generation (FedEx / UPS).
 */
@Component
public class MockShippingCarrierAdapter implements ShippingCarrierAdapter {

    private static final Logger log = LoggerFactory.getLogger(MockShippingCarrierAdapter.class);

    @Override
    public ShippingResult createShipment(UUID orderId, String shipmentReference, String destinationAddress) {
        log.info("[MOCK_SHIPPING_CARRIER] Creating shipment label: orderId={}, ref={}, address={}",
                orderId, shipmentReference, destinationAddress);

        String trackingNumber = "TRK-FDX-" + UUID.randomUUID().toString().substring(0, 10).toUpperCase();
        log.info("[MOCK_SHIPPING_CARRIER] Label created: trackingNumber={}", trackingNumber);

        return new ShippingResult(true, trackingNumber, "FEDEX_SIMULATED", null);
    }
}
