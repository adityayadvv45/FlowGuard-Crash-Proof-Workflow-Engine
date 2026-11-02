package com.flowguard.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record WorkflowDefinitionResponse(
        UUID id,
        String name,
        String description,
        String definitionJson,
        int version,
        OffsetDateTime createdAt
) {}
