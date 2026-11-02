import React from 'react';
import { ExecutionResponse } from '../types';
import { History } from 'lucide-react';

interface ExecutionHistoryTableProps {
  executions: ExecutionResponse[];
  selectedExecutionId: string | null;
  onSelectExecution: (id: string) => void;
}

export const ExecutionHistoryTable: React.FC<ExecutionHistoryTableProps> = ({
  executions,
  selectedExecutionId,
  onSelectExecution,
}) => {
  return (
    <div className="table-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div className="section-title">
          <History size={18} color="#38bdf8" />
          <span>Execution History</span>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
          {executions.length} Total Runs
        </span>
      </div>

      {executions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '13px' }}>
          No executions recorded yet. Click &quot;Start Standard Flow&quot; to begin.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Execution ID</th>
                <th>Workflow</th>
                <th>Status</th>
                <th>Started</th>
                <th>Duration</th>
                <th>Idempotency Key</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((exec) => {
                const isSelected = exec.id === selectedExecutionId;
                const duration = exec.durationMillis != null ? `${(exec.durationMillis / 1000).toFixed(2)}s` : '—';
                const time = new Date(exec.createdAt).toLocaleTimeString();

                return (
                  <tr
                    key={exec.id}
                    className={isSelected ? 'active-row' : ''}
                    onClick={() => onSelectExecution(exec.id)}
                  >
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#38bdf8' }}>
                      {exec.id.substring(0, 8)}...
                    </td>
                    <td>{exec.workflowName}</td>
                    <td>
                      <span className={`badge badge-${exec.status}`}>
                        {exec.status}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                      {time}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                      {duration}
                    </td>
                    <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#94a3b8' }}>
                      {exec.idempotencyKey || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
