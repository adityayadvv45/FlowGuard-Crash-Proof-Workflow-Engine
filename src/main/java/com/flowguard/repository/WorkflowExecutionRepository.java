package com.flowguard.repository;

import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WorkflowExecutionRepository extends JpaRepository<WorkflowExecution, UUID> {

    Page<WorkflowExecution> findByStatus(WorkflowStatus status, Pageable pageable);

    Optional<WorkflowExecution> findByIdempotencyKey(String idempotencyKey);

    long countByStatus(WorkflowStatus status);

    @Query("SELECT e FROM WorkflowExecution e WHERE e.status IN ('PENDING', 'RUNNING') ORDER BY e.createdAt ASC")
    List<WorkflowExecution> findIncompleteExecutions();
}
