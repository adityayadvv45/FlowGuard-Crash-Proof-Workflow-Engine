package com.flowguard.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.Map;

public record CreateWorkflowRequest(
        @NotBlank(message = "Workflow name is required")
        String name,

        String description,

        @NotEmpty(message = "Workflow must contain at least one step")
        @Valid
        List<StepDefinitionDto> steps
) {
    public record StepDefinitionDto(
            @NotBlank(message = "Step key is required")
            String stepKey,

            @NotBlank(message = "Step name is required")
            String name,

            int order,

            Map<String, Object> config
    ) {}
}
