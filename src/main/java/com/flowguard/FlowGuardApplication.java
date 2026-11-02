package com.flowguard;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.info.Contact;
import io.swagger.v3.oas.annotations.info.Info;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@OpenAPIDefinition(
        info = @Info(
                title = "FlowGuard — Crash-Proof Workflow Engine API",
                version = "1.0.0",
                description = "Durable workflow orchestration engine with atomic step-level leases, exponential backoff retries, and crash recovery.",
                contact = @Contact(name = "FlowGuard Engineering")
        )
)
public class FlowGuardApplication {

    public static void main(String[] args) {
        SpringApplication.run(FlowGuardApplication.class, args);
    }
}
