package com.flowguard.enums;

public enum StepStatus {
    PENDING,
    RUNNING,
    RETRY_WAIT,
    COMPLETED,
    FAILED,
    CANCELLED;

    public boolean isTerminal() {
        return this == COMPLETED || this == FAILED || this == CANCELLED;
    }
}
