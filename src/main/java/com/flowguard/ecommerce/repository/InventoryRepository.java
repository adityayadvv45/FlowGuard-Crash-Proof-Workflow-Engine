package com.flowguard.ecommerce.repository;

import com.flowguard.ecommerce.entity.Inventory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface InventoryRepository extends JpaRepository<Inventory, UUID> {

    Optional<Inventory> findByProductId(UUID productId);

    /**
     * Atomically reserves available inventory if and only if sufficient quantity exists.
     * Prevents negative inventory and race conditions under concurrent checkouts.
     * @return 1 if successfully reserved; 0 if insufficient stock.
     */
    @Modifying
    @Query("UPDATE Inventory i SET " +
           "i.availableQuantity = i.availableQuantity - :qty, " +
           "i.reservedQuantity = i.reservedQuantity + :qty, " +
           "i.updatedAt = :now " +
           "WHERE i.productId = :productId AND i.availableQuantity >= :qty")
    int reserveStock(
            @Param("productId") UUID productId,
            @Param("qty") int qty,
            @Param("now") OffsetDateTime now
    );

    /**
     * Atomically releases reserved inventory back to available stock upon order cancellation or payment failure.
     */
    @Modifying
    @Query("UPDATE Inventory i SET " +
           "i.availableQuantity = i.availableQuantity + :qty, " +
           "i.reservedQuantity = i.reservedQuantity - :qty, " +
           "i.updatedAt = :now " +
           "WHERE i.productId = :productId AND i.reservedQuantity >= :qty")
    int releaseStock(
            @Param("productId") UUID productId,
            @Param("qty") int qty,
            @Param("now") OffsetDateTime now
    );

    /**
     * Atomically finalizes deduction of reserved inventory upon confirmed shipment dispatch.
     */
    @Modifying
    @Query("UPDATE Inventory i SET " +
           "i.reservedQuantity = i.reservedQuantity - :qty, " +
           "i.totalQuantity = i.totalQuantity - :qty, " +
           "i.updatedAt = :now " +
           "WHERE i.productId = :productId AND i.reservedQuantity >= :qty")
    int deductReservedStock(
            @Param("productId") UUID productId,
            @Param("qty") int qty,
            @Param("now") OffsetDateTime now
    );

    /**
     * Controlled replenishment adding stock to available and total quantities.
     */
    @Modifying
    @Query("UPDATE Inventory i SET " +
           "i.availableQuantity = i.availableQuantity + :qty, " +
           "i.totalQuantity = i.totalQuantity + :qty, " +
           "i.updatedAt = :now " +
           "WHERE i.productId = :productId")
    int replenishStock(
            @Param("productId") UUID productId,
            @Param("qty") int qty,
            @Param("now") OffsetDateTime now
    );
}
