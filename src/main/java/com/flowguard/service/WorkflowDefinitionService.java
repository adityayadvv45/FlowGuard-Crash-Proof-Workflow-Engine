package com.flowguard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.dto.CreateWorkflowRequest;
import com.flowguard.dto.WorkflowDefinitionResponse;
import com.flowguard.engine.StepRegistry;
import com.flowguard.entity.WorkflowDefinition;
import com.flowguard.exception.ResourceNotFoundException;
import com.flowguard.exception.WorkflowException;
import com.flowguard.repository.WorkflowDefinitionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class WorkflowDefinitionService {

    private final WorkflowDefinitionRepository definitionRepository;
    private final StepRegistry stepRegistry;
    private final ObjectMapper objectMapper;

    public WorkflowDefinitionService(
            WorkflowDefinitionRepository definitionRepository,
            StepRegistry stepRegistry,
            ObjectMapper objectMapper
    ) {
        this.definitionRepository = definitionRepository;
        this.stepRegistry = stepRegistry;
        this.objectMapper = objectMapper;
    }

    @org.springframework.context.event.EventListener(org.springframework.boot.context.event.ApplicationReadyEvent.class)
    @Transactional
    public void seedDefaultWorkflowIfAbsent() {
        UUID defaultId = UUID.fromString("a0000000-0000-0000-0000-000000000001");
        if (definitionRepository.findById(defaultId).isEmpty()) {
            WorkflowDefinition def = new WorkflowDefinition(
                    defaultId,
                    "Order Processing Workflow",
                    "Sequential 4-step e-commerce workflow with validation, payment, inventory reservation, and customer notification.",
                    "{\"steps\":[{\"stepKey\":\"VALIDATE_ORDER\",\"name\":\"Validate Order\",\"order\":1},{\"stepKey\":\"PROCESS_PAYMENT\",\"name\":\"Process Payment\",\"order\":2},{\"stepKey\":\"UPDATE_INVENTORY\",\"name\":\"Update Inventory\",\"order\":3},{\"stepKey\":\"SEND_NOTIFICATION\",\"name\":\"Send Confirmation Notification\",\"order\":4}]}",
                    1,
                    null
            );
            definitionRepository.save(def);
        }

        UUID ecommerceWorkflowId = UUID.fromString("a0000000-0000-0000-0000-000000000002");
        if (definitionRepository.findById(ecommerceWorkflowId).isEmpty()) {
            WorkflowDefinition ecomDef = new WorkflowDefinition(
                    ecommerceWorkflowId,
                    "E-Commerce Order Fulfillment Pipeline",
                    "Sequential 6-step durable e-commerce workflow: validation, inventory reservation, payment processing, confirmation, shipment creation, and customer dispatch notification.",
                    "{\"steps\":[{\"stepKey\":\"VALIDATE_ORDER\",\"name\":\"Validate Order & Payload\",\"order\":1},{\"stepKey\":\"RESERVE_INVENTORY\",\"name\":\"Reserve Inventory Stock\",\"order\":2},{\"stepKey\":\"INITIATE_PAYMENT\",\"name\":\"Authorize & Settle Payment\",\"order\":3},{\"stepKey\":\"CONFIRM_ORDER\",\"name\":\"Confirm Order Status\",\"order\":4},{\"stepKey\":\"PREPARE_SHIPMENT\",\"name\":\"Prepare Shipping Label\",\"order\":5},{\"stepKey\":\"SEND_NOTIFICATION\",\"name\":\"Dispatch Confirmation Notification\",\"order\":6}]}",
                    1,
                    null
            );
            definitionRepository.save(ecomDef);
        }
    }

    @Transactional
    public WorkflowDefinitionResponse createDefinition(CreateWorkflowRequest request) {
        // Validate steps
        if (request.steps() == null || request.steps().isEmpty()) {
            throw new WorkflowException("Workflow definition must contain at least one step");
        }

        for (CreateWorkflowRequest.StepDefinitionDto step : request.steps()) {
            if (step.stepKey() == null || step.stepKey().isBlank()) {
                throw new WorkflowException("Step key cannot be blank");
            }
            if (!stepRegistry.isSupported(step.stepKey())) {
                throw new WorkflowException("Unsupported step key '" + step.stepKey() + "'. Approved step types: " + stepRegistry.getRegisteredKeys());
            }
        }

        // Sort steps by order
        List<CreateWorkflowRequest.StepDefinitionDto> sortedSteps = request.steps().stream()
                .sorted(Comparator.comparingInt(CreateWorkflowRequest.StepDefinitionDto::order))
                .toList();

        String definitionJson;
        try {
            definitionJson = objectMapper.writeValueAsString(java.util.Map.of("steps", sortedSteps));
        } catch (JsonProcessingException e) {
            throw new WorkflowException("Failed to serialize definition JSON: " + e.getMessage());
        }

        WorkflowDefinition definition = new WorkflowDefinition();
        definition.setName(request.name());
        definition.setDescription(request.description());
        definition.setDefinitionJson(definitionJson);
        definition.setVersion(1);

        WorkflowDefinition saved = definitionRepository.save(definition);
        return mapToResponse(saved);
    }

    public List<WorkflowDefinitionResponse> getAllDefinitions() {
        return definitionRepository.findAll().stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public WorkflowDefinitionResponse getDefinitionById(UUID id) {
        return definitionRepository.findById(id)
                .map(this::mapToResponse)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow definition not found for ID: " + id));
    }

    public WorkflowDefinition getEntityById(UUID id) {
        return definitionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Workflow definition not found for ID: " + id));
    }

    private WorkflowDefinitionResponse mapToResponse(WorkflowDefinition entity) {
        return new WorkflowDefinitionResponse(
                entity.getId(),
                entity.getName(),
                entity.getDescription(),
                entity.getDefinitionJson(),
                entity.getVersion(),
                entity.getCreatedAt()
        );
    }
}
