package com.flowguard.exception;

public class TransientStepException extends RuntimeException {
    public TransientStepException(String message) {
        super(message);
    }

    public TransientStepException(String message, Throwable cause) {
        super(message, cause);
    }
}
