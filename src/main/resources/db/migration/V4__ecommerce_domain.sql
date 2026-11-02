-- V4__ecommerce_domain.sql: E-commerce Business Domain Schema
-- Tables: products, inventory, orders, order_items, payments, shipments

-- 1. Products Table
CREATE TABLE products (
    id UUID PRIMARY KEY,
    sku VARCHAR(64) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    category VARCHAR(64) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_active ON products(active);

-- 2. Inventory Table
CREATE TABLE inventory (
    id UUID PRIMARY KEY,
    product_id UUID NOT NULL UNIQUE REFERENCES products(id) ON DELETE CASCADE,
    available_quantity INT NOT NULL DEFAULT 0 CHECK (available_quantity >= 0),
    reserved_quantity INT NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
    total_quantity INT NOT NULL DEFAULT 0 CHECK (total_quantity >= 0),
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_total_quantity CHECK (total_quantity = available_quantity + reserved_quantity)
);

CREATE INDEX idx_inventory_product_id ON inventory(product_id);

-- 3. Orders Table
CREATE TABLE orders (
    id UUID PRIMARY KEY,
    order_reference VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE RESTRICT,
    workflow_execution_id UUID REFERENCES workflow_executions(id) ON DELETE SET NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    subtotal NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (subtotal >= 0),
    tax NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (tax >= 0),
    shipping_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (shipping_fee >= 0),
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    idempotency_key VARCHAR(255),
    shipping_address TEXT NOT NULL,
    customer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    cancellation_reason TEXT,
    CONSTRAINT uk_orders_user_idempotency UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_orders_reference ON orders(order_reference);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_workflow_execution ON orders(workflow_execution_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at);

-- 4. Order Items Table
CREATE TABLE order_items (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
    product_sku VARCHAR(64) NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    total_price NUMERIC(12, 2) NOT NULL CHECK (total_price >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);

-- 5. Payments Table
CREATE TABLE payments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    payment_reference VARCHAR(64) NOT NULL UNIQUE,
    external_transaction_id VARCHAR(128),
    idempotency_key VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
    payment_method VARCHAR(64) NOT NULL DEFAULT 'SIMULATED_GATEWAY',
    failure_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    settled_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_payments_reference ON payments(payment_reference);
CREATE INDEX idx_payments_status ON payments(status);

-- 6. Shipments Table
CREATE TABLE shipments (
    id UUID PRIMARY KEY,
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    shipment_reference VARCHAR(64) NOT NULL UNIQUE,
    tracking_number VARCHAR(128),
    carrier VARCHAR(64) NOT NULL DEFAULT 'SIMULATED_CARRIER',
    status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    shipping_address TEXT NOT NULL,
    estimated_delivery_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_shipments_order_id ON shipments(order_id);
CREATE INDEX idx_shipments_reference ON shipments(shipment_reference);
CREATE INDEX idx_shipments_status ON shipments(status);

-- 7. Seed Initial E-Commerce Catalog & Inventory
INSERT INTO products (id, sku, name, description, price, currency, category, active, created_at, updated_at)
VALUES 
(
    'c0000000-0000-0000-0000-000000000001',
    'LAPTOP-MBP-14',
    'MacBook Pro 14" M3',
    'Apple M3 chip, 16GB Unified Memory, 512GB SSD Storage, Liquid Retina XDR display.',
    1599.00,
    'USD',
    'Computers',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'c0000000-0000-0000-0000-000000000002',
    'AUDIO-WH-1000XM5',
    'Sony WH-1000XM5 Noise-Canceling Headphones',
    'Industry-leading wireless noise cancellation, 30-hour battery life, multipoint connection.',
    399.00,
    'USD',
    'Audio',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'c0000000-0000-0000-0000-000000000003',
    'DISPLAY-DELL-U27',
    'Dell UltraSharp 27" 4K Monitor',
    'IPS Black technology, USB-C hub connectivity, 98% DCI-P3 color gamut coverage.',
    549.50,
    'USD',
    'Monitors',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'c0000000-0000-0000-0000-000000000004',
    'KEYBOARD-KEYCHRON-Q1',
    'Keychron Q1 Pro Wireless Mechanical Keyboard',
    'Custom CNC aluminum body, QMK/VIA programmable, hot-swappable switches.',
    199.00,
    'USD',
    'Accessories',
    TRUE,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- Initial Inventory Stock (available = 50, reserved = 0, total = 50)
INSERT INTO inventory (id, product_id, available_quantity, reserved_quantity, total_quantity, version, updated_at)
VALUES
(
    'd0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    50,
    0,
    50,
    0,
    CURRENT_TIMESTAMP
),
(
    'd0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000002',
    100,
    0,
    100,
    0,
    CURRENT_TIMESTAMP
),
(
    'd0000000-0000-0000-0000-000000000003',
    'c0000000-0000-0000-0000-000000000003',
    40,
    0,
    40,
    0,
    CURRENT_TIMESTAMP
),
(
    'd0000000-0000-0000-0000-000000000004',
    'c0000000-0000-0000-0000-000000000004',
    75,
    0,
    75,
    0,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

-- 8. Seed the 6-Step E-Commerce Workflow Definition
INSERT INTO workflow_definitions (id, name, description, definition_json, version, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000002',
    'E-Commerce Order Fulfillment Pipeline',
    'Sequential 6-step durable e-commerce workflow: validation, inventory reservation, payment processing, confirmation, shipment creation, and customer dispatch notification.',
    '{"steps":[{"stepKey":"VALIDATE_ORDER","name":"Validate Order & Payload","order":1},{"stepKey":"RESERVE_INVENTORY","name":"Reserve Inventory Stock","order":2},{"stepKey":"INITIATE_PAYMENT","name":"Authorize & Settle Payment","order":3},{"stepKey":"CONFIRM_ORDER","name":"Confirm Order Status","order":4},{"stepKey":"PREPARE_SHIPMENT","name":"Prepare Shipping Label","order":5},{"stepKey":"SEND_NOTIFICATION","name":"Dispatch Confirmation Notification","order":6}]}',
    1,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
