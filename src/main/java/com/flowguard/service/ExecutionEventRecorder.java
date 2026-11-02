package com.flowguard.service;

import com.flowguard.entity.ExecutionEvent;
import com.flowguard.enums.EventType;
import com.flowguard.repository.ExecutionEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class ExecutionEventRecorder {

    private static final Logger log = LoggerFactory.getLogger(ExecutionEventRecorder.class);
    private final ExecutionEventRepository eventRepository;

    public ExecutionEventRecorder(ExecutionEventRepository eventRepository) {
        this.eventRepository = eventRepository;
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public ExecutionEvent recordEvent(UUID workflowExecutionId, UUID stepExecutionId, EventType eventType, String message, String detailsJson) {
        ExecutionEvent event = new ExecutionEvent(workflowExecutionId, stepExecutionId, eventType, message, detailsJson);
        ExecutionEvent saved = eventRepository.save(event);
        log.info("[EVENT] workflowId={} stepId={} type={} message={}", workflowExecutionId, stepExecutionId, eventType, message);
        return saved;
    }
}
