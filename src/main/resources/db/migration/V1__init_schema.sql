-- V1__init_schema.sql: Initial schema for FlowGuard Workflow Engine

CREATE TABLE workflow_definitions (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    definition_json TEXT NOT NULL,
    version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_definition_id UUID NOT NULL REFERENCES workflow_definitions(id),
    workflow_version INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    input_json TEXT,
    output_json TEXT,
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT
);

CREATE TABLE step_executions (
    id UUID PRIMARY KEY,
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_key VARCHAR(100) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    step_order INT NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    input_json TEXT,
    output_json TEXT,
    error_message TEXT,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    worker_lease_owner VARCHAR(255),
    worker_lease_until TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_step_exec_workflow_key UNIQUE (workflow_execution_id, step_key)
);

CREATE TABLE execution_events (
    id BIGSERIAL PRIMARY KEY,
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    step_execution_id UUID REFERENCES step_executions(id) ON DELETE SET NULL,
    event_type VARCHAR(64) NOT NULL,
    message TEXT NOT NULL,
    details_json TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE idempotency_records (
    id UUID PRIMARY KEY,
    idempotency_key VARCHAR(255) NOT NULL UNIQUE,
    request_hash VARCHAR(128) NOT NULL,
    workflow_execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance and atomic claim queries
CREATE INDEX idx_exec_status ON workflow_executions(status);
CREATE INDEX idx_exec_created ON workflow_executions(created_at DESC);
CREATE INDEX idx_step_status_retry ON step_executions(status, next_retry_at);
CREATE INDEX idx_step_lease ON step_executions(status, worker_lease_until);
CREATE INDEX idx_step_exec_order ON step_executions(workflow_execution_id, step_order ASC);
CREATE INDEX idx_events_workflow ON execution_events(workflow_execution_id, created_at ASC);
CREATE INDEX idx_idempotency_key ON idempotency_records(idempotency_key);
