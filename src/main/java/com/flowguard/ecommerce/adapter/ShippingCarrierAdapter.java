package com.flowguard.ecommerce.adapter;

import java.util.UUID;

public interface ShippingCarrierAdapter {

    record ShippingResult(
            boolean successful,
            String trackingNumber,
            String carrierName,
            String failureReason
    ) {}

    ShippingResult createShipment(UUID orderId, String shipmentReference, String destinationAddress);
}
