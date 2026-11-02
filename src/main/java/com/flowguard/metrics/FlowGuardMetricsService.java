package com.flowguard.metrics;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;
import org.springframework.stereotype.Service;

import java.util.concurrent.TimeUnit;

@Service
public class FlowGuardMetricsService {

    private final MeterRegistry registry;
    private final ThreadPoolTaskExecutor workerExecutor;

    private final Counter totalExecutionsCounter;
    private final Counter completedExecutionsCounter;
    private final Counter failedExecutionsCounter;
    private final Counter retriesScheduledCounter;
    private final Counter recoveriesPerformedCounter;
    private final Counter rejectedTasksCounter;
    private final Timer workflowDurationTimer;
    private final Timer stepDurationTimer;

    public FlowGuardMetricsService(MeterRegistry registry, ThreadPoolTaskExecutor workerExecutor) {
        this.registry = registry;
        this.workerExecutor = workerExecutor;

        this.totalExecutionsCounter = Counter.builder("flowguard.executions.total")
                .description("Total number of workflow execution attempts started")
                .register(registry);

        this.completedExecutionsCounter = Counter.builder("flowguard.executions.completed")
                .description("Total number of workflow executions completed successfully")
                .register(registry);

        this.failedExecutionsCounter = Counter.builder("flowguard.executions.failed")
                .description("Total number of workflow executions in terminal failure")
                .register(registry);

        this.retriesScheduledCounter = Counter.builder("flowguard.retries.scheduled")
                .description("Total number of step retries scheduled")
                .register(registry);

        this.recoveriesPerformedCounter = Counter.builder("flowguard.recoveries.performed")
                .description("Total number of orphaned worker lease recovery sweeps performed")
                .register(registry);

        this.rejectedTasksCounter = Counter.builder("flowguard.worker.rejected")
                .description("Total number of worker task submissions deferred due to queue saturation")
                .register(registry);

        this.workflowDurationTimer = Timer.builder("flowguard.workflow.duration")
                .description("Duration of completed workflow executions")
                .register(registry);

        this.stepDurationTimer = Timer.builder("flowguard.step.duration")
                .description("Duration of individual step executions")
                .register(registry);

        // Register worker pool gauges
        registry.gauge("flowguard.worker.pool.size", workerExecutor, ThreadPoolTaskExecutor::getPoolSize);
        registry.gauge("flowguard.worker.active.count", workerExecutor, ThreadPoolTaskExecutor::getActiveCount);
        registry.gauge("flowguard.worker.queue.size", workerExecutor, e -> e.getThreadPoolExecutor().getQueue().size());
        registry.gauge("flowguard.worker.queue.capacity", workerExecutor, ThreadPoolTaskExecutor::getQueueCapacity);
    }

    public void recordExecutionStarted() {
        totalExecutionsCounter.increment();
    }

    public void recordExecutionCompleted(long durationMs) {
        completedExecutionsCounter.increment();
        if (durationMs > 0) {
            workflowDurationTimer.record(durationMs, TimeUnit.MILLISECONDS);
        }
    }

    public void recordExecutionFailed() {
        failedExecutionsCounter.increment();
    }

    public void recordRetryScheduled() {
        retriesScheduledCounter.increment();
    }

    public void recordRecoveryPerformed() {
        recoveriesPerformedCounter.increment();
    }

    public void recordWorkerRejected() {
        rejectedTasksCounter.increment();
    }

    public void recordStepCompleted(String stepKey, long durationMs) {
        Counter.builder("flowguard.steps.completed")
                .tag("step", stepKey)
                .register(registry)
                .increment();
        if (durationMs > 0) {
            stepDurationTimer.record(durationMs, TimeUnit.MILLISECONDS);
        }
    }

    public void recordStepFailed(String stepKey, boolean permanent) {
        Counter.builder("flowguard.steps.failed")
                .tag("step", stepKey)
                .tag("type", permanent ? "permanent" : "transient")
                .register(registry)
                .increment();
    }

    public int getQueueSize() {
        return workerExecutor.getThreadPoolExecutor() != null
                ? workerExecutor.getThreadPoolExecutor().getQueue().size()
                : 0;
    }

    public int getActiveWorkerCount() {
        return workerExecutor.getActiveCount();
    }

    public int getPoolSize() {
        return workerExecutor.getPoolSize();
    }

    public int getQueueCapacity() {
        return workerExecutor.getQueueCapacity();
    }
}

