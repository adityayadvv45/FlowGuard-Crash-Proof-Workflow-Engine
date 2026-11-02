package com.flowguard.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.entity.IdempotencyRecord;
import com.flowguard.exception.IdempotencyConflictException;
import com.flowguard.repository.IdempotencyRecordRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class IdempotencyServiceTest {

    private IdempotencyRecordRepository repository;
    private IdempotencyService idempotencyService;

    @BeforeEach
    void setUp() {
        repository = Mockito.mock(IdempotencyRecordRepository.class);
        idempotencyService = new IdempotencyService(repository, new ObjectMapper());
    }

    @Test
    @DisplayName("Should return existing execution ID when idempotency key and payload match")
    void shouldReturnExistingWhenPayloadMatches() {
        String key = "order-req-123";
        Map<String, Object> payload = Map.of("orderId", "123", "amount", 50.0);
        String hash = idempotencyService.computeHash(payload);
        UUID executionId = UUID.randomUUID();

        IdempotencyRecord record = new IdempotencyRecord(key, hash, executionId);
        when(repository.findByIdempotencyKey(key)).thenReturn(Optional.of(record));

        Optional<UUID> result = idempotencyService.findExistingExecution(key, hash);
        assertTrue(result.isPresent());
        assertEquals(executionId, result.get());
    }

    @Test
    @DisplayName("Should throw IdempotencyConflictException when key matches but payload differs")
    void shouldThrowConflictWhenPayloadDiffers() {
        String key = "order-req-123";
        Map<String, Object> originalPayload = Map.of("orderId", "123", "amount", 50.0);
        Map<String, Object> alteredPayload = Map.of("orderId", "123", "amount", 999.0);

        String originalHash = idempotencyService.computeHash(originalPayload);
        String alteredHash = idempotencyService.computeHash(alteredPayload);

        IdempotencyRecord record = new IdempotencyRecord(key, originalHash, UUID.randomUUID());
        when(repository.findByIdempotencyKey(key)).thenReturn(Optional.of(record));

        assertThrows(IdempotencyConflictException.class, () ->
                idempotencyService.findExistingExecution(key, alteredHash)
        );
    }
}
