package com.flowguard.repository;

import com.flowguard.entity.StepExecution;
import com.flowguard.enums.StepStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StepExecutionRepository extends JpaRepository<StepExecution, UUID> {

    List<StepExecution> findByWorkflowExecutionIdOrderByStepOrderAsc(UUID workflowExecutionId);

    List<StepExecution> findByWorkflowExecutionIdIn(java.util.Collection<UUID> workflowExecutionIds);

    Optional<StepExecution> findByWorkflowExecutionIdAndStepKey(UUID workflowExecutionId, String stepKey);

    @Query("SELECT s FROM StepExecution s WHERE s.status = 'RETRY_WAIT' AND s.nextRetryAt <= :now ORDER BY s.nextRetryAt ASC")
    List<StepExecution> findStepsReadyForRetry(@Param("now") OffsetDateTime now);

    @Query("SELECT s FROM StepExecution s WHERE s.status = 'RUNNING' AND s.workerLeaseUntil < :now")
    List<StepExecution> findExpiredLeases(@Param("now") OffsetDateTime now);

    @org.springframework.transaction.annotation.Transactional
    @Modifying
    @Query("""
        UPDATE StepExecution s
        SET s.status = :newStatus,
            s.workerLeaseOwner = :workerId,
            s.workerLeaseUntil = :leaseUntil,
            s.startedAt = CASE WHEN s.startedAt IS NULL THEN :now ELSE s.startedAt END,
            s.attemptCount = s.attemptCount + 1,
            s.updatedAt = :now
        WHERE s.id = :id
          AND (s.status = com.flowguard.enums.StepStatus.PENDING 
               OR s.status = com.flowguard.enums.StepStatus.RETRY_WAIT 
               OR (s.status = com.flowguard.enums.StepStatus.RUNNING AND s.workerLeaseUntil < :now))
    """)
    int claimStep(
            @Param("id") UUID id,
            @Param("newStatus") StepStatus newStatus,
            @Param("workerId") String workerId,
            @Param("leaseUntil") OffsetDateTime leaseUntil,
            @Param("now") OffsetDateTime now
    );

    @org.springframework.transaction.annotation.Transactional
    @Modifying
    @Query("""
        UPDATE StepExecution s
        SET s.workerLeaseUntil = :leaseUntil,
            s.updatedAt = :now
        WHERE s.id = :id 
          AND s.workerLeaseOwner = :workerId 
          AND s.status = com.flowguard.enums.StepStatus.RUNNING
    """)
    int renewLease(
            @Param("id") UUID id,
            @Param("workerId") String workerId,
            @Param("leaseUntil") OffsetDateTime leaseUntil,
            @Param("now") OffsetDateTime now
    );
}
