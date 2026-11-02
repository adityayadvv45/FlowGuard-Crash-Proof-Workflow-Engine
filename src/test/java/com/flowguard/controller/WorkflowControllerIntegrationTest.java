package com.flowguard.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.dto.CreateWorkflowRequest;
import com.flowguard.dto.StartExecutionRequest;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class WorkflowControllerIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    @DisplayName("Should create workflow definition via POST /api/workflows")
    void shouldCreateWorkflowDefinition() throws Exception {
        CreateWorkflowRequest request = new CreateWorkflowRequest(
                "Payment Pipeline Flow",
                "Testing payment pipeline creation",
                List.of(
                        new CreateWorkflowRequest.StepDefinitionDto("VALIDATE_ORDER", "Validate Order", 1, null),
                        new CreateWorkflowRequest.StepDefinitionDto("PROCESS_PAYMENT", "Process Payment", 2, null)
                )
        );

        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.name", is("Payment Pipeline Flow")));
    }

    @Test
    @DisplayName("Should reject invalid workflow definition with unsupported step key")
    void shouldRejectUnsupportedStepKey() throws Exception {
        CreateWorkflowRequest request = new CreateWorkflowRequest(
                "Malicious Flow",
                "Attempt to run unauthorized arbitrary class",
                List.of(
                        new CreateWorkflowRequest.StepDefinitionDto("UNAUTHORIZED_ARBITRARY_STEP", "Hacked Step", 1, null)
                )
        );

        mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error", is("Bad Request")));
    }

    @Test
    @DisplayName("Should enforce idempotency: 201 for first, 201/200 for duplicate, 409 for conflict")
    void shouldEnforceIdempotencyRules() throws Exception {
        // First create a definition
        CreateWorkflowRequest defReq = new CreateWorkflowRequest(
                "Idempotent Test Flow",
                "Idempotency verification",
                List.of(new CreateWorkflowRequest.StepDefinitionDto("VALIDATE_ORDER", "Validate", 1, null))
        );
        String defContent = mockMvc.perform(post("/api/workflows")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(defReq)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        String defId = objectMapper.readTree(defContent).get("id").asText();
        String idempotencyKey = "idem-key-" + UUID.randomUUID();

        StartExecutionRequest startReq = new StartExecutionRequest(Map.of("amount", 100.0), idempotencyKey, null, null);

        // 1. Initial request -> 201 Created
        mockMvc.perform(post("/api/workflows/" + defId + "/executions")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty());

        // 2. Exact same payload + key -> returns existing execution
        mockMvc.perform(post("/api/workflows/" + defId + "/executions")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(startReq)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idempotencyKey", is(idempotencyKey)));

        // 3. Different payload + same key -> 409 Conflict
        StartExecutionRequest conflictReq = new StartExecutionRequest(Map.of("amount", 99999.0), idempotencyKey, null, null);
        mockMvc.perform(post("/api/workflows/" + defId + "/executions")
                        .header("Idempotency-Key", idempotencyKey)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(conflictReq)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.error", is("Conflict")));
    }
}
