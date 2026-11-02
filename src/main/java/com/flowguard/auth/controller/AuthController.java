package com.flowguard.auth.controller;

import com.flowguard.auth.dto.*;
import com.flowguard.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication & User Accounts", description = "Endpoints for user registration, authentication, profile inspection, and session management")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @Operation(summary = "Register a new user account", description = "Creates a persistent user record in PostgreSQL with salted PBKDF2 password hashing and returns an authentication session token.")
    public ResponseEntity<AuthResponse> signUp(@Valid @RequestBody SignUpRequest request) {
        AuthResponse response = authService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    @Operation(summary = "Authenticate user credentials", description = "Verifies username/email and password against stored PBKDF2 hash, issues an auth token, and updates last login timestamp.")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/me")
    @Operation(summary = "Get current authenticated user profile", description = "Validates session token passed in Authorization header and returns current user account details.")
    public ResponseEntity<UserAccountResponse> getCurrentUser(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        UserAccountResponse response = authService.getCurrentUser(authHeader);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/account")
    @Operation(summary = "Update account details", description = "Updates full name, engineer role, or changes password after verifying the current password.")
    public ResponseEntity<UserAccountResponse> updateAccount(
            @RequestHeader(value = "Authorization", required = false) String authHeader,
            @Valid @RequestBody UpdateAccountRequest request
    ) {
        UserAccountResponse response = authService.updateAccount(authHeader, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    @Operation(summary = "Log out user session", description = "Invalidates and removes active session token from PostgreSQL.")
    public ResponseEntity<Void> logout(
            @RequestHeader(value = "Authorization", required = false) String authHeader
    ) {
        authService.logout(authHeader);
        return ResponseEntity.noContent().build();
    }
}

