package com.flowguard.service;

import com.flowguard.repository.StepExecutionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;

import java.time.OffsetDateTime;
import java.time.temporal.ChronoUnit;

import static org.junit.jupiter.api.Assertions.*;

class RetryServiceTest {

    private RetryService retryService;

    @BeforeEach
    void setUp() {
        // maxAttempts=3, initialDelay=2s, multiplier=2.0, maxDelay=30s, jitter=0.0
        retryService = new RetryService(3, 2, 2.0, 30, 0.0, null, null);
    }

    @Test
    @DisplayName("Should correctly allow retry when under max attempts")
    void shouldAllowRetryUnderMaxAttempts() {
        assertTrue(retryService.canRetry(1));
        assertTrue(retryService.canRetry(2));
        assertFalse(retryService.canRetry(3));
        assertFalse(retryService.canRetry(4));
    }

    @Test
    @DisplayName("Should calculate exponential backoff accurately")
    void shouldCalculateExponentialBackoff() {
        OffsetDateTime now = OffsetDateTime.now();

        // Attempt 1 -> 2 * (2^0) = 2 seconds
        OffsetDateTime retry1 = retryService.calculateNextRetry(1);
        long delay1 = ChronoUnit.SECONDS.between(now, retry1);
        assertEquals(2, delay1, 1);

        // Attempt 2 -> 2 * (2^1) = 4 seconds
        OffsetDateTime retry2 = retryService.calculateNextRetry(2);
        long delay2 = ChronoUnit.SECONDS.between(now, retry2);
        assertEquals(4, delay2, 1);

        // Attempt 3 -> 2 * (2^2) = 8 seconds
        OffsetDateTime retry3 = retryService.calculateNextRetry(3);
        long delay3 = ChronoUnit.SECONDS.between(now, retry3);
        assertEquals(8, delay3, 1);
    }
}
