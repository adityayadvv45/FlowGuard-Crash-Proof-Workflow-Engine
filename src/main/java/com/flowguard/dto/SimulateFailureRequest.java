package com.flowguard.dto;

import jakarta.validation.constraints.NotBlank;

public record SimulateFailureRequest(
        @NotBlank(message = "Step key is required")
        String stepKey,

        // Mode: "CRASH" (simulates worker killed/interrupted), "TRANSIENT" (triggers retry), "PERMANENT" (fails immediately)
        @NotBlank(message = "Failure mode is required (CRASH, TRANSIENT, PERMANENT)")
        String mode
) {}
