package com.flowguard.dto;

import com.flowguard.enums.EventType;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ExecutionEventResponse(
        Long id,
        UUID workflowExecutionId,
        UUID stepExecutionId,
        EventType eventType,
        String message,
        String detailsJson,
        OffsetDateTime createdAt
) {}
