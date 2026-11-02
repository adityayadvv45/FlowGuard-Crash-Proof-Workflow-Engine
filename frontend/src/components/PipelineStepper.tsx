import React from 'react';
import { ExecutionResponse, StepExecution, StepStatus } from '../types';
import { CheckCircle2, Clock, PlayCircle, AlertCircle, RefreshCw, Eye } from 'lucide-react';

interface PipelineStepperProps {
  execution: ExecutionResponse;
  onViewJson: (title: string, json: string | null) => void;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ execution, onViewJson }) => {
  const getStatusIcon = (status: StepStatus) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 size={16} color="#34d399" />;
      case 'RUNNING':
        return <PlayCircle size={16} color="#38bdf8" />;
      case 'RETRY_WAIT':
        return <RefreshCw size={16} color="#fbbf24" />;
      case 'FAILED':
        return <AlertCircle size={16} color="#f87171" />;
      default:
        return <Clock size={16} color="#94a3b8" />;
    }
  };

  return (
    <div className="pipeline-section">
      <div className="section-header">
        <div className="section-title">
          <span>{execution.workflowName}</span>
          <span className={`badge badge-${execution.status}`}>
            {execution.status}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {execution.durationMillis != null && (
            <span style={{ fontSize: '13px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
              Duration: {(execution.durationMillis / 1000).toFixed(2)}s
            </span>
          )}
          <button
            className="btn btn-secondary"
            style={{ padding: '6px 12px', fontSize: '12px' }}
            onClick={() => onViewJson('Workflow Input Payload', execution.inputJson)}
          >
            <Eye size={13} />
            <span>Workflow Input</span>
          </button>
          {execution.outputJson && (
            <button
              className="btn btn-secondary"
              style={{ padding: '6px 12px', fontSize: '12px' }}
              onClick={() => onViewJson('Workflow Final Output', execution.outputJson)}
            >
              <Eye size={13} />
              <span>Final Output</span>
            </button>
          )}
        </div>
      </div>

      <div className="stepper-grid">
        {execution.steps.map((step: StepExecution) => (
          <div key={step.id} className={`step-card status-${step.status}`}>
            <div className="step-top">
              <span className="step-number">Step #{step.stepOrder}</span>
              <span className={`badge badge-${step.status}`}>
                {getStatusIcon(step.status)}
                {step.status}
              </span>
            </div>

            <div className="step-name">{step.stepName}</div>

            <div className="step-meta">
              <span>Attempts: {step.attemptCount}</span>
              {step.durationMillis != null && (
                <span>Duration: {(step.durationMillis / 1000).toFixed(2)}s</span>
              )}
              {step.workerLeaseOwner && (
                <span style={{ color: '#38bdf8' }}>
                  Lease: {step.workerLeaseOwner}
                </span>
              )}
              {step.nextRetryAt && (
                <span style={{ color: '#fbbf24' }}>
                  Next Retry: {new Date(step.nextRetryAt).toLocaleTimeString()}
                </span>
              )}
            </div>

            {step.errorMessage && (
              <div className="step-error-box">
                {step.errorMessage}
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
              {step.outputJson && (
                <button
                  className="btn btn-secondary"
                  style={{ padding: '4px 10px', fontSize: '11px', flex: 1 }}
                  onClick={() => onViewJson(`Step Output: ${step.stepName}`, step.outputJson)}
                >
                  <Eye size={12} />
                  <span>Output Data</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
