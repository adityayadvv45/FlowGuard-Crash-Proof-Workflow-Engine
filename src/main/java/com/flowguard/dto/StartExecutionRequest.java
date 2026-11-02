package com.flowguard.dto;

import java.util.Map;

public record StartExecutionRequest(
        Map<String, Object> inputData,
        String idempotencyKey,
        // Optional failure injection parameters for the crash demo
        String failAtStepKey,
        String failureMode // "CRASH", "TRANSIENT", "PERMANENT"
) {}
