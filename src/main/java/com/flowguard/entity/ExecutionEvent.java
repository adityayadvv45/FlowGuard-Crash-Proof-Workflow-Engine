package com.flowguard.entity;

import com.flowguard.enums.EventType;
import jakarta.persistence.*;
import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "execution_events")
public class ExecutionEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "workflow_execution_id", nullable = false)
    private UUID workflowExecutionId;

    @Column(name = "step_execution_id")
    private UUID stepExecutionId;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 64)
    private EventType eventType;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Column(name = "details_json", columnDefinition = "TEXT")
    private String detailsJson;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    public ExecutionEvent() {
    }

    public ExecutionEvent(UUID workflowExecutionId, UUID stepExecutionId, EventType eventType, String message, String detailsJson) {
        this.workflowExecutionId = workflowExecutionId;
        this.stepExecutionId = stepExecutionId;
        this.eventType = eventType;
        this.message = message;
        this.detailsJson = detailsJson;
        this.createdAt = OffsetDateTime.now();
    }

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = OffsetDateTime.now();
        }
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public UUID getWorkflowExecutionId() { return workflowExecutionId; }
    public void setWorkflowExecutionId(UUID workflowExecutionId) { this.workflowExecutionId = workflowExecutionId; }

    public UUID getStepExecutionId() { return stepExecutionId; }
    public void setStepExecutionId(UUID stepExecutionId) { this.stepExecutionId = stepExecutionId; }

    public EventType getEventType() { return eventType; }
    public void setEventType(EventType eventType) { this.eventType = eventType; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getDetailsJson() { return detailsJson; }
    public void setDetailsJson(String detailsJson) { this.detailsJson = detailsJson; }

    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
}
