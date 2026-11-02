package com.flowguard.ecommerce.controller;

import com.flowguard.ecommerce.dto.AdjustInventoryRequest;
import com.flowguard.ecommerce.dto.InventoryDto;
import com.flowguard.ecommerce.dto.ReplenishInventoryRequest;
import com.flowguard.ecommerce.service.InventoryService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/ecommerce/inventory")
public class InventoryController {

    private final InventoryService inventoryService;

    public InventoryController(InventoryService inventoryService) {
        this.inventoryService = inventoryService;
    }

    /**
     * Retrieves current inventory levels (available, reserved, total) for a product.
     */
    @GetMapping("/{productId}")
    public ResponseEntity<InventoryDto> getInventory(@PathVariable UUID productId) {
        return ResponseEntity.ok(inventoryService.getInventoryByProductId(productId));
    }

    /**
     * Replenishes stock for a product through controlled inventory intake.
     */
    @PostMapping("/{productId}/replenish")
    public ResponseEntity<InventoryDto> replenishStock(
            @PathVariable UUID productId,
            @Valid @RequestBody ReplenishInventoryRequest request
    ) {
        return ResponseEntity.ok(inventoryService.replenishStock(
                productId,
                request.quantity(),
                request.reason()
        ));
    }

    /**
     * Adjusts available stock for audit or physical cycle-count reconciliations.
     */
    @PostMapping("/{productId}/adjust")
    public ResponseEntity<InventoryDto> adjustStock(
            @PathVariable UUID productId,
            @Valid @RequestBody AdjustInventoryRequest request
    ) {
        return ResponseEntity.ok(inventoryService.adjustStock(
                productId,
                request.newAvailableQuantity(),
                request.reason()
        ));
    }
}
