package com.flowguard.repository;

import com.flowguard.entity.ExecutionEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ExecutionEventRepository extends JpaRepository<ExecutionEvent, Long> {
    List<ExecutionEvent> findByWorkflowExecutionIdOrderByCreatedAtAsc(UUID workflowExecutionId);

    List<ExecutionEvent> findByWorkflowExecutionIdIn(java.util.Collection<UUID> workflowExecutionIds);
}
