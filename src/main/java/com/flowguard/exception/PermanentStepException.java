package com.flowguard.exception;

public class PermanentStepException extends RuntimeException {
    public PermanentStepException(String message) {
        super(message);
    }

    public PermanentStepException(String message, Throwable cause) {
        super(message, cause);
    }
}
