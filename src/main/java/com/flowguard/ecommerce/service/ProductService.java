package com.flowguard.ecommerce.service;

import com.flowguard.ecommerce.dto.CreateProductRequest;
import com.flowguard.ecommerce.dto.ProductDto;
import com.flowguard.ecommerce.dto.UpdateProductRequest;
import com.flowguard.ecommerce.entity.Inventory;
import com.flowguard.ecommerce.entity.Product;
import com.flowguard.ecommerce.repository.InventoryRepository;
import com.flowguard.ecommerce.repository.ProductRepository;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.exception.WorkflowException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProductService {

    private static final Logger log = LoggerFactory.getLogger(ProductService.class);

    private final ProductRepository productRepository;
    private final InventoryRepository inventoryRepository;

    public ProductService(ProductRepository productRepository, InventoryRepository inventoryRepository) {
        this.productRepository = productRepository;
        this.inventoryRepository = inventoryRepository;
    }

    @Transactional(readOnly = true)
    public Page<ProductDto> listProducts(String category, Boolean activeOnly, String search, Pageable pageable) {
        Page<Product> page = productRepository.findWithFilters(
                category != null && !category.isBlank() ? category.trim() : null,
                activeOnly,
                search != null && !search.isBlank() ? search.trim() : null,
                pageable
        );

        return page.map(this::toDto);
    }

    @Transactional(readOnly = true)
    public ProductDto getProductById(UUID id) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));
        return toDto(p);
    }

    @Transactional
    public ProductDto createProduct(CreateProductRequest request) {
        String sku = request.sku().trim().toUpperCase();
        if (productRepository.existsBySkuIgnoreCase(sku)) {
            throw new WorkflowException("Product with SKU '" + sku + "' already exists");
        }

        OffsetDateTime now = OffsetDateTime.now();
        UUID productId = UUID.randomUUID();

        Product product = new Product(
                productId,
                sku,
                request.name().trim(),
                request.description(),
                request.price(),
                request.currency() != null ? request.currency().trim().toUpperCase() : "USD",
                request.category().trim(),
                true,
                now,
                now
        );
        productRepository.save(product);

        // Initialize inventory stock
        int initialStock = Math.max(0, request.initialStock());
        Inventory inventory = new Inventory(
                UUID.randomUUID(),
                productId,
                initialStock,
                0,
                initialStock,
                now
        );
        inventoryRepository.save(inventory);

        log.info("[ECOMMERCE_PRODUCT] Created product id={}, sku={}, initialStock={}", productId, sku, initialStock);
        return toDto(product, initialStock);
    }

    @Transactional
    public ProductDto updateProduct(UUID id, UpdateProductRequest request) {
        Product p = productRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Product not found with ID: " + id));

        if (request.name() != null && !request.name().isBlank()) {
            p.setName(request.name().trim());
        }
        if (request.description() != null) {
            p.setDescription(request.description().trim());
        }
        if (request.price() != null) {
            p.setPrice(request.price());
        }
        if (request.category() != null && !request.category().isBlank()) {
            p.setCategory(request.category().trim());
        }
        if (request.active() != null) {
            p.setActive(request.active());
        }

        p.setUpdatedAt(OffsetDateTime.now());
        Product saved = productRepository.save(p);
        return toDto(saved);
    }

    private ProductDto toDto(Product p) {
        Integer available = inventoryRepository.findByProductId(p.getId())
                .map(Inventory::getAvailableQuantity)
                .orElse(0);
        return toDto(p, available);
    }

    private ProductDto toDto(Product p, Integer available) {
        return new ProductDto(
                p.getId(),
                p.getSku(),
                p.getName(),
                p.getDescription(),
                p.getPrice(),
                p.getCurrency(),
                p.getCategory(),
                p.isActive(),
                available,
                p.getCreatedAt(),
                p.getUpdatedAt()
        );
    }
}
