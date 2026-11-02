import React from 'react';
import { Play, Flame, RefreshCcw, XCircle, RotateCcw } from 'lucide-react';
import { ExecutionResponse } from '../types';

interface ExecutionControlsProps {
  onStartStandard: () => void;
  onStartCrashDemo: () => void;
  onStartTransientRetryDemo: () => void;
  onRetry: () => void;
  onCancel: () => void;
  currentExecution: ExecutionResponse | null;
  isLoading: boolean;
}

export const ExecutionControls: React.FC<ExecutionControlsProps> = ({
  onStartStandard,
  onStartCrashDemo,
  onStartTransientRetryDemo,
  onRetry,
  onCancel,
  currentExecution,
  isLoading,
}) => {
  const isRunning = currentExecution?.status === 'RUNNING' || currentExecution?.status === 'PENDING';
  const isFailed = currentExecution?.status === 'FAILED';

  return (
    <div className="controls-bar">
      <div>
        <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '4px' }}>
          Interactive Execution Lab
        </div>
        <div style={{ fontSize: '12px', color: '#94a3b8' }}>
          Trigger real background executions, crash simulations, or transient retry policies.
        </div>
      </div>

      <div className="controls-actions">
        <button
          className="btn btn-primary"
          onClick={onStartStandard}
          disabled={isLoading}
        >
          <Play size={16} fill="white" />
          <span>Start Standard Flow</span>
        </button>

        <button
          className="btn btn-danger"
          onClick={onStartCrashDemo}
          disabled={isLoading}
          title="Simulates worker crash after Process Payment. Shows recovery on lease expiry without repeating steps 1 & 2!"
        >
          <Flame size={16} />
          <span>Demo Crash & Recover</span>
        </button>

        <button
          className="btn btn-warning"
          onClick={onStartTransientRetryDemo}
          disabled={isLoading}
          title="Simulates 504 Gateway timeout during Payment to verify exponential backoff"
        >
          <RefreshCcw size={16} />
          <span>Demo Transient Retry</span>
        </button>

        {isFailed && (
          <button className="btn btn-secondary" onClick={onRetry} disabled={isLoading}>
            <RotateCcw size={16} />
            <span>Manual Retry</span>
          </button>
        )}

        {isRunning && (
          <button className="btn btn-secondary" onClick={onCancel} disabled={isLoading}>
            <XCircle size={16} />
            <span>Cancel</span>
          </button>
        )}
      </div>
    </div>
  );
};
