package com.flowguard.controller;

import com.flowguard.dto.SystemHealthResponse;
import com.flowguard.metrics.FlowGuardMetricsService;
import com.flowguard.repository.StepExecutionRepository;
import com.flowguard.repository.WorkflowExecutionRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.lang.management.ManagementFactory;
import java.time.OffsetDateTime;

@RestController
@RequestMapping("/api/system")
@Tag(name = "System Health & Diagnostics", description = "Endpoints for inspecting engine health, database connectivity, and worker concurrency")
public class SystemHealthController {

    private final WorkflowExecutionRepository executionRepository;
    private final StepExecutionRepository stepRepository;
    private final FlowGuardMetricsService metricsService;

    private final String workerId;
    private final long leaseDurationSeconds;
    private final long recoveryIntervalSeconds;
    private final long retryPollIntervalSeconds;

    public SystemHealthController(
            WorkflowExecutionRepository executionRepository,
            StepExecutionRepository stepRepository,
            FlowGuardMetricsService metricsService,
            @Value("${flowguard.engine.worker-id:flowguard-worker-1}") String workerId,
            @Value("${flowguard.engine.lease-duration-seconds:25}") long leaseDurationSeconds,
            @Value("${flowguard.engine.recovery-interval-seconds:10}") long recoveryIntervalSeconds,
            @Value("${flowguard.engine.retry-poll-interval-seconds:2}") long retryPollIntervalSeconds
    ) {
        this.executionRepository = executionRepository;
        this.stepRepository = stepRepository;
        this.metricsService = metricsService;
        this.workerId = workerId;
        this.leaseDurationSeconds = leaseDurationSeconds;
        this.recoveryIntervalSeconds = recoveryIntervalSeconds;
        this.retryPollIntervalSeconds = retryPollIntervalSeconds;
    }

    @GetMapping("/health")
    @Operation(summary = "Get comprehensive operational system health")
    public ResponseEntity<SystemHealthResponse> getSystemHealth() {
        String dbStatus;
        try {
            executionRepository.count();
            dbStatus = "CONNECTED";
        } catch (Exception e) {
            dbStatus = "DEGRADED";
        }

        OffsetDateTime now = OffsetDateTime.now();
        long activeLeases = stepRepository.countActiveLeases(now);

        Runtime runtime = Runtime.getRuntime();
        long heapUsedMb = (runtime.totalMemory() - runtime.freeMemory()) / (1024 * 1024);
        long heapMaxMb = runtime.maxMemory() / (1024 * 1024);
        long uptime = ManagementFactory.getRuntimeMXBean().getUptime();

        SystemHealthResponse response = new SystemHealthResponse(
                "CONNECTED".equals(dbStatus) ? "UP" : "DEGRADED",
                dbStatus,
                workerId,
                metricsService.getActiveWorkerCount(),
                metricsService.getPoolSize(),
                metricsService.getQueueSize(),
                metricsService.getQueueCapacity(),
                activeLeases,
                leaseDurationSeconds,
                recoveryIntervalSeconds,
                retryPollIntervalSeconds,
                uptime,
                heapUsedMb,
                heapMaxMb,
                now
        );

        return ResponseEntity.ok(response);
    }
}

