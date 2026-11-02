package com.flowguard.repository;

import com.flowguard.entity.ExecutionEvent;
import com.flowguard.enums.EventType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExecutionEventRepository extends JpaRepository<ExecutionEvent, Long> {
    List<ExecutionEvent> findByWorkflowExecutionIdOrderByCreatedAtAsc(UUID workflowExecutionId);

    List<ExecutionEvent> findByWorkflowExecutionIdIn(Collection<UUID> workflowExecutionIds);

    Page<ExecutionEvent> findAllByOrderByCreatedAtDesc(Pageable pageable);

    Page<ExecutionEvent> findByWorkflowExecutionIdOrderByCreatedAtDesc(UUID workflowExecutionId, Pageable pageable);

    Page<ExecutionEvent> findByEventTypeOrderByCreatedAtDesc(EventType eventType, Pageable pageable);

    Page<ExecutionEvent> findByWorkflowExecutionIdAndEventTypeOrderByCreatedAtDesc(UUID workflowExecutionId, EventType eventType, Pageable pageable);
}
