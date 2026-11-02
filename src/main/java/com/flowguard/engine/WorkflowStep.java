package com.flowguard.engine;

public interface WorkflowStep {
    String getStepKey();
    String getDefaultName();
    StepResult execute(StepExecutionContext context) throws Exception;
}
