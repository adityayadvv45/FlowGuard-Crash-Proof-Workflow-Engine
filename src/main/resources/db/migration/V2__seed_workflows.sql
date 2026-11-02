-- V2__seed_workflows.sql: Seed default Order Processing Workflow

INSERT INTO workflow_definitions (id, name, description, definition_json, version, created_at)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Order Processing Workflow',
    'Sequential 4-step e-commerce workflow with validation, payment, inventory reservation, and customer notification.',
    '{"steps":[{"stepKey":"VALIDATE_ORDER","name":"Validate Order","order":1},{"stepKey":"PROCESS_PAYMENT","name":"Process Payment","order":2},{"stepKey":"UPDATE_INVENTORY","name":"Update Inventory","order":3},{"stepKey":"SEND_NOTIFICATION","name":"Send Confirmation Notification","order":4}]}',
    1,
    CURRENT_TIMESTAMP
) ON CONFLICT (id) DO NOTHING;
