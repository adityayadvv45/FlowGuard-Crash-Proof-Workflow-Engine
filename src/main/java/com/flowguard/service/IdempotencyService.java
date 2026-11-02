package com.flowguard.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.flowguard.entity.IdempotencyRecord;
import com.flowguard.exception.IdempotencyConflictException;
import com.flowguard.repository.IdempotencyRecordRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdempotencyService {

    private final IdempotencyRecordRepository idempotencyRepository;
    private final ObjectMapper objectMapper;

    public IdempotencyService(IdempotencyRecordRepository idempotencyRepository, ObjectMapper objectMapper) {
        this.idempotencyRepository = idempotencyRepository;
        this.objectMapper = objectMapper;
    }

    public String computeHash(Object payload) {
        if (payload == null) {
            return "empty";
        }
        try {
            String json = objectMapper.writeValueAsString(payload);
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(json.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (JsonProcessingException | NoSuchAlgorithmException e) {
            return String.valueOf(payload.hashCode());
        }
    }

    @Transactional
    public Optional<UUID> findExistingExecution(String idempotencyKey, String currentHash) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return Optional.empty();
        }

        Optional<IdempotencyRecord> recordOpt = idempotencyRepository.findByIdempotencyKey(idempotencyKey);
        if (recordOpt.isPresent()) {
            IdempotencyRecord record = recordOpt.get();
            if (!record.getRequestHash().equals(currentHash)) {
                throw new IdempotencyConflictException(
                        "Idempotency key '" + idempotencyKey + "' was previously used with a different request payload."
                );
            }
            return Optional.of(record.getWorkflowExecutionId());
        }
        return Optional.empty();
    }

    @Transactional
    public void recordKey(String idempotencyKey, String requestHash, UUID workflowExecutionId) {
        if (idempotencyKey == null || idempotencyKey.isBlank()) {
            return;
        }
        try {
            IdempotencyRecord record = new IdempotencyRecord(idempotencyKey, requestHash, workflowExecutionId);
            idempotencyRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException e) {
            // Concurrent insert race condition: check if conflicting payload or match
            IdempotencyRecord existing = idempotencyRepository.findByIdempotencyKey(idempotencyKey)
                    .orElseThrow(() -> e);
            if (!existing.getRequestHash().equals(requestHash)) {
                throw new IdempotencyConflictException(
                        "Idempotency key '" + idempotencyKey + "' was concurrently registered with a different request payload."
                );
            }
        }
    }
}
