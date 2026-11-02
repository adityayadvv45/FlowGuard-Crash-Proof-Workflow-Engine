package com.flowguard.auth.repository;

import com.flowguard.auth.entity.AuthToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AuthTokenRepository extends JpaRepository<AuthToken, String> {
    Optional<AuthToken> findByTokenAndExpiresAtAfter(String token, OffsetDateTime now);
    void deleteByUserId(UUID userId);
    void deleteByExpiresAtBefore(OffsetDateTime now);
}
