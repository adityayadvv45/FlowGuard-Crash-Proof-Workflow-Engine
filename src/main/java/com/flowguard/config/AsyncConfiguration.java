package com.flowguard.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.util.concurrent.Executor;

@Configuration
@EnableAsync
@EnableScheduling
public class AsyncConfiguration {

    private static final Logger log = LoggerFactory.getLogger(AsyncConfiguration.class);

    @Bean(name = "workflowWorkerExecutor")
    public Executor workflowWorkerExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(4);
        executor.setMaxPoolSize(16);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("flowguard-worker-");

        // Do not use CallerRunsPolicy: executing synchronously on HTTP servlet threads or @Scheduled
        // recovery timer threads violates non-blocking API contracts and blocks recovery sweeps.
        // In FlowGuard's durable architecture, all executions and steps are persisted in PostgreSQL
        // prior to worker submission. If the queue saturates, the task is logged and deferred to the
        // database; RecoveryService automatically dispatches pending unstarted executions on its next sweep.
        executor.setRejectedExecutionHandler((runnable, poolExecutor) -> {
            log.warn("[WORKER_POOL] Worker queue capacity (100) reached. Worker dispatch deferred to durable recovery sweep.");
        });

        executor.initialize();
        return executor;
    }
}
