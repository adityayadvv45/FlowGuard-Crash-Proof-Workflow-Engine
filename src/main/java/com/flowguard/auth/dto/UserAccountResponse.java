package com.flowguard.auth.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserAccountResponse(
        UUID id,
        String username,
        String email,
        String fullName,
        String role,
        OffsetDateTime createdAt,
        OffsetDateTime lastLoginAt
) {}

