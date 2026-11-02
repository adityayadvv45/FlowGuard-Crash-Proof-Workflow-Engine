package com.flowguard.repository;

import com.flowguard.entity.WorkflowExecution;
import com.flowguard.enums.WorkflowStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
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

    @Query("""
        SELECT e FROM WorkflowExecution e
        WHERE (:status IS NULL OR e.status = :status)
          AND (CAST(:startDate AS timestamp) IS NULL OR e.createdAt >= :startDate)
          AND (CAST(:endDate AS timestamp) IS NULL OR e.createdAt <= :endDate)
          AND (:searchTerm IS NULL OR :searchTerm = '' 
               OR LOWER(e.inputJson) LIKE LOWER(CONCAT('%', :searchTerm, '%')) 
               OR LOWER(e.idempotencyKey) LIKE LOWER(CONCAT('%', :searchTerm, '%'))
               OR CAST(e.id AS string) LIKE LOWER(CONCAT('%', :searchTerm, '%')))
    """)
    Page<WorkflowExecution> findWithFilters(
            @Param("status") WorkflowStatus status,
            @Param("startDate") OffsetDateTime startDate,
            @Param("endDate") OffsetDateTime endDate,
            @Param("searchTerm") String searchTerm,
            Pageable pageable
    );
}
