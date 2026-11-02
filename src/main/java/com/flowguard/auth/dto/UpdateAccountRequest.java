package com.flowguard.auth.dto;

import jakarta.validation.constraints.Size;

public record UpdateAccountRequest(
        String fullName,
        String role,
        String currentPassword,
        @Size(min = 6, max = 100, message = "New password must be at least 6 characters")
        String newPassword
) {}

