package com.flowguard.ecommerce.service;

import com.flowguard.ecommerce.dto.InventoryDto;
import com.flowguard.ecommerce.entity.Inventory;
import com.flowguard.ecommerce.entity.Product;
import com.flowguard.ecommerce.repository.InventoryRepository;
import com.flowguard.ecommerce.repository.ProductRepository;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.exception.WorkflowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class InventoryService {

    private static final Logger log = LoggerFactory.getLogger(InventoryService.class);

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    public InventoryService(InventoryRepository inventoryRepository, ProductRepository productRepository) {
        this.inventoryRepository = inventoryRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public InventoryDto getInventoryByProductId(UUID productId) {
        Inventory inv = inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for product: " + productId));
        Product product = productRepository.findById(productId).orElse(null);

        return toDto(inv, product);
    }

    /**
     * Atomically reserves stock for a product using database-level conditional update.
     * Prevents race conditions and overselling even under parallel concurrent checkouts.
     */
    @Transactional
    public boolean reserveStock(UUID productId, int quantity) {
        if (quantity <= 0) return true;
        int updated = inventoryRepository.reserveStock(productId, quantity, OffsetDateTime.now());
        if (updated == 1) {
            log.info("[INVENTORY] Atomically reserved quantity={} for product={}", quantity, productId);
            return true;
        } else {
            log.warn("[INVENTORY] Insufficient stock to reserve quantity={} for product={}", quantity, productId);
            return false;
        }
    }

    /**
     * Atomically releases reserved stock back into available inventory.
     */
    @Transactional
    public boolean releaseStock(UUID productId, int quantity) {
        if (quantity <= 0) return true;
        int updated = inventoryRepository.releaseStock(productId, quantity, OffsetDateTime.now());
        log.info("[INVENTORY] Released reserved quantity={} for product={}, updatedRows={}", quantity, productId, updated);
        return updated == 1;
    }

    /**
     * Atomically deducts reserved stock upon confirmed shipment dispatch.
     */
    @Transactional
    public boolean deductReservedStock(UUID productId, int quantity) {
        if (quantity <= 0) return true;
        int updated = inventoryRepository.deductReservedStock(productId, quantity, OffsetDateTime.now());
        log.info("[INVENTORY] Deducted fulfilled quantity={} for product={}, updatedRows={}", quantity, productId, updated);
        return updated == 1;
    }

    /**
     * Controlled inventory replenishment operation.
     */
    @Transactional
    public InventoryDto replenishStock(UUID productId, int quantity, String reason) {
        if (quantity <= 0) {
            throw new WorkflowException("Replenishment quantity must be greater than zero");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        int updated = inventoryRepository.replenishStock(productId, quantity, OffsetDateTime.now());
        if (updated == 0) {
            // Initialize if not present
            Inventory newInv = new Inventory(UUID.randomUUID(), productId, quantity, 0, quantity, OffsetDateTime.now());
            inventoryRepository.save(newInv);
        }

        log.info("[INVENTORY] Replenished stock for product={}, addedQty={}, reason='{}'", productId, quantity, reason);
        Inventory inv = inventoryRepository.findByProductId(productId).orElseThrow();
        return toDto(inv, product);
    }

    /**
     * Controlled inventory audit adjustment operation.
     */
    @Transactional
    public InventoryDto adjustStock(UUID productId, int newAvailableQuantity, String reason) {
        if (newAvailableQuantity < 0) {
            throw new WorkflowException("Available quantity cannot be negative");
        }

        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + productId));

        Inventory inv = inventoryRepository.findByProductId(productId)
                .orElseThrow(() -> new ResourceNotFoundException("Inventory not found for product: " + productId));

        inv.setAvailableQuantity(newAvailableQuantity);
        inv.setTotalQuantity(newAvailableQuantity + inv.getReservedQuantity());
        inv.setUpdatedAt(OffsetDateTime.now());
        Inventory saved = inventoryRepository.save(inv);

        log.warn("[INVENTORY_AUDIT] Adjusted available stock for product={} to {}, reason='{}'",
                productId, newAvailableQuantity, reason);

        return toDto(saved, product);
    }

    private InventoryDto toDto(Inventory inv, Product p) {
        return new InventoryDto(
                inv.getId(),
                inv.getProductId(),
                p != null ? p.getSku() : null,
                p != null ? p.getName() : null,
                inv.getAvailableQuantity(),
                inv.getReservedQuantity(),
                inv.getTotalQuantity(),
                inv.getVersion(),
                inv.getUpdatedAt()
        );
    }
}
