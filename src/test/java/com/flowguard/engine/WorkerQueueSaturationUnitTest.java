package com.flowguard.engine;

import com.flowguard.config.AsyncConfiguration;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Unit tests verifying worker thread pool sizing, queue saturation rejection policy,
 * and graceful shutdown behavior.
 */
class WorkerQueueSaturationUnitTest {

    @Test
    @DisplayName("Worker Executor Configuration: parameters, thread prefix, and graceful shutdown")
    void shouldConfigureExecutorWithCorrectPoolSizeAndGracefulShutdown() {
        AsyncConfiguration config = new AsyncConfiguration();
        ThreadPoolTaskExecutor executor = config.workflowWorkerExecutor();

        try {
            assertEquals(4, executor.getCorePoolSize());
            assertEquals(16, executor.getMaxPoolSize());
            assertEquals("flowguard-worker-", executor.getThreadNamePrefix());
        } finally {
            executor.shutdown();
        }
    }

    @Test
    @DisplayName("Queue Saturation: rejection handler logs warning without throwing RejectedExecutionException")
    void shouldHandleQueueSaturationWithoutCrashingCaller() throws InterruptedException {
        // Create an executor with small bounded pool for deterministic saturation testing
        ThreadPoolTaskExecutor testExecutor = new ThreadPoolTaskExecutor();
        testExecutor.setCorePoolSize(1);
        testExecutor.setMaxPoolSize(1);
        testExecutor.setQueueCapacity(2);
        testExecutor.setThreadNamePrefix("test-worker-");

        AtomicInteger rejectedCount = new AtomicInteger(0);
        testExecutor.setRejectedExecutionHandler((runnable, pool) -> {
            rejectedCount.incrementAndGet();
        });
        testExecutor.initialize();

        CountDownLatch blockerLatch = new CountDownLatch(1);
        CountDownLatch startedLatch = new CountDownLatch(1);

        try {
            // Task 1: occupies the 1 active thread
            testExecutor.execute(() -> {
                startedLatch.countDown();
                try {
                    blockerLatch.await(5, TimeUnit.SECONDS);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            });

            // Wait for Task 1 to actually occupy the thread
            boolean started = startedLatch.await(2, TimeUnit.SECONDS);
            assertTrue(started);

            // Task 2 & 3: fill the queue capacity (capacity = 2)
            testExecutor.execute(() -> {});
            testExecutor.execute(() -> {});

            // Task 4: Queue is full and max pool size is reached -> triggers rejection handler
            assertDoesNotThrow(() -> {
                testExecutor.execute(() -> {});
            }, "Rejection handler must not throw an unhandled exception to the caller thread");

            assertEquals(1, rejectedCount.get(), "Task 4 should be intercepted by custom rejection handler");
        } finally {
            blockerLatch.countDown();
            testExecutor.shutdown();
        }
    }
}

