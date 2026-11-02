import React, { useState } from 'react';
import { ExecutionResponse, WorkflowStatus } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDuration, formatDateTime, truncateId } from '../../utils/formatters';
import {
  RotateCcw,
  Ban,
  Eye,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';

interface ExecutionsPageProps {
  executions: ExecutionResponse[];
  totalElements: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSelectExecution: (id: string) => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  statusFilter: WorkflowStatus | 'ALL';
  onStatusFilterChange: (st: WorkflowStatus | 'ALL') => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const ExecutionsPage: React.FC<ExecutionsPageProps> = ({
  executions,
  totalElements,
  currentPage,
  onPageChange,
  onSelectExecution,
  onRetry,
  onCancel,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
}) => {
  const statusOptions: (WorkflowStatus | 'ALL')[] = [
    'ALL',
    'RUNNING',
    'COMPLETED',
    'FAILED',
    'CANCELLED',
  ];

  const totalPages = Math.max(1, Math.ceil(totalElements / 20));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter Bar */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Filter size={14} style={{ color: '#8b949e', marginRight: '6px' }} />
          {statusOptions.map((st) => {
            const isActive = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => onStatusFilterChange(st)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #38bdf8' : '1px solid #21262d',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : '#161b22',
                  color: isActive ? '#38bdf8' : '#8b949e',
                  fontSize: '0.74rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {st}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '4px 10px',
            width: '260px',
          }}
        >
          <Search size={14} style={{ color: '#8b949e', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search by ID, payload, idempotency..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f6fc',
              fontSize: '0.76rem',
              width: '100%',
            }}
          />
        </div>
      </div>

      {/* Main Executions Table */}
      <Card noPadding>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d', backgroundColor: 'rgba(255, 255, 255, 0.015)' }}>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Execution ID</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Workflow</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Progress</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Idempotency Key</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Created At</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => {
                const completedSteps = e.steps.filter((s) => s.status === 'COMPLETED').length;
                const totalSteps = e.steps.length;

                return (
                  <tr
                    key={e.id}
                    onClick={() => onSelectExecution(e.id)}
                    style={{
                      borderBottom: '1px solid #161b22',
                      cursor: 'pointer',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                    onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
                      {truncateId(e.id, 8, 4)}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#f0f6fc', fontWeight: 500 }}>
                      {e.workflowName}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <Badge status={e.status} size="sm" pulse={e.status === 'RUNNING'} />
                    </td>
                    <td style={{ padding: '12px 18px', color: '#c9d1d9', fontFamily: 'monospace' }}>
                      {formatDuration(e.durationMillis)}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#8b949e' }}>
                      <span style={{ color: completedSteps === totalSteps ? '#10b981' : '#c9d1d9', fontWeight: 600 }}>
                        {completedSteps}
                      </span>
                      /{totalSteps}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#8b949e', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                      {truncateId(e.idempotencyKey, 10, 4)}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#8b949e' }}>
                      {formatDateTime(e.createdAt)}
                    </td>
                    <td
                      style={{ padding: '12px 18px', textAlign: 'right' }}
                      onClick={(ev) => ev.stopPropagation()}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => onSelectExecution(e.id)}
                          title="View Details"
                          style={{
                            background: '#161b22',
                            border: '1px solid #21262d',
                            borderRadius: '5px',
                            color: '#c9d1d9',
                            padding: '4px 8px',
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                        </button>
                        {e.status === 'FAILED' && (
                          <button
                            onClick={() => onRetry(e.id)}
                            title="Retry Execution"
                            style={{
                              background: 'rgba(245, 158, 11, 0.1)',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '5px',
                              color: '#fbbf24',
                              padding: '4px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            <RotateCcw size={13} />
                          </button>
                        )}
                        {e.status === 'RUNNING' && (
                          <button
                            onClick={() => onCancel(e.id)}
                            title="Cancel Execution"
                            style={{
                              background: 'rgba(239, 68, 68, 0.1)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              borderRadius: '5px',
                              color: '#f87171',
                              padding: '4px 8px',
                              cursor: 'pointer',
                            }}
                          >
                            <Ban size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {executions.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#6e7681' }}>
                    No executions matching the current filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #21262d',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.78rem',
            color: '#8b949e',
            backgroundColor: 'rgba(255, 255, 255, 0.01)',
          }}
        >
          <div>
            Showing {executions.length} of {totalElements} executions
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage <= 0}
              style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '4px 8px',
                color: currentPage <= 0 ? '#484f58' : '#c9d1d9',
                cursor: currentPage <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontFamily: 'monospace' }}>
              Page {currentPage + 1} of {totalPages}
            </span>
            <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage >= totalPages - 1}
              style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '4px 8px',
                color: currentPage >= totalPages - 1 ? '#484f58' : '#c9d1d9',
                cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};
