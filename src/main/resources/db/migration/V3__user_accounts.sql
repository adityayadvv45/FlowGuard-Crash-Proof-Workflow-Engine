-- V3__user_accounts.sql: Schema for User Accounts & Token Authentication

CREATE TABLE user_accounts (
    id UUID PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(64) NOT NULL DEFAULT 'ENGINEER',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_user_accounts_email ON user_accounts(email);
CREATE INDEX idx_user_accounts_username ON user_accounts(username);

CREATE TABLE auth_tokens (
    token VARCHAR(255) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES user_accounts(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

CREATE INDEX idx_auth_tokens_user_id ON auth_tokens(user_id);
CREATE INDEX idx_auth_tokens_expires_at ON auth_tokens(expires_at);

-- Seed default user accounts for immediate access
-- Passwords default to "password123"
INSERT INTO user_accounts (id, username, email, password_hash, full_name, role, created_at, updated_at)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'aditya',
    'aditya@flowlab.dev',
    'PBKDF2$65536$dGVzdHNhbHQxMjM0NTY3OA==$0f8c3e4a9b2d1e5f8a7c6e5d4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a',
    'Aditya Yadav',
    'Lead Backend Engineer',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000002',
    'sarah',
    'sarah@flowlab.dev',
    'PBKDF2$65536$dGVzdHNhbHQxMjM0NTY3OA==$0f8c3e4a9b2d1e5f8a7c6e5d4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a',
    'Sarah Chen',
    'Staff SDE & Architect',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
),
(
    'b0000000-0000-0000-0000-000000000003',
    'alex',
    'alex@flowlab.dev',
    'PBKDF2$65536$dGVzdHNhbHQxMjM0NTY3OA==$0f8c3e4a9b2d1e5f8a7c6e5d4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a',
    'Alex Rivera',
    'DevOps & Site Reliability',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;
