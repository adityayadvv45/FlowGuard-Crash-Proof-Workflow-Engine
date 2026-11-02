import React, { useState, useEffect } from 'react';
import { ExecutionEventResponse, EventType, PaginatedEventsResponse } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { fetchGlobalEvents } from '../../services/api';
import { formatDateTime, truncateId } from '../../utils/formatters';
import {
  FileText,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Code,
  CheckCircle,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface EventHistoryPageProps {
  onSelectExecution: (id: string) => void;
  onViewJson: (title: string, json: string | null) => void;
}

export const EventHistoryPage: React.FC<EventHistoryPageProps> = ({
  onSelectExecution,
  onViewJson,
}) => {
  const [events, setEvents] = useState<ExecutionEventResponse[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(0);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | 'ALL'>('ALL');
  const [executionIdSearch, setExecutionIdSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const eventTypes: (EventType | 'ALL')[] = [
    'ALL',
    'EXECUTION_STARTED',
    'STEP_STARTED',
    'STEP_COMPLETED',
    'STEP_FAILED',
    'RETRY_SCHEDULED',
    'RECOVERY_PERFORMED',
    'EXECUTION_COMPLETED',
    'EXECUTION_FAILED',
  ];

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res: PaginatedEventsResponse = await fetchGlobalEvents(
        page,
        25,
        eventTypeFilter === 'ALL' ? undefined : eventTypeFilter,
        executionIdSearch.trim() || undefined
      );
      setEvents(res.content || []);
      setTotalElements(res.totalElements || 0);
      setTotalPages(res.totalPages || 1);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [page, eventTypeFilter, executionIdSearch]);

  const getEventBadgeColor = (type: EventType) => {
    switch (type) {
      case 'EXECUTION_COMPLETED':
      case 'STEP_COMPLETED':
        return { bg: 'rgba(16, 185, 129, 0.1)', text: '#10b981', border: 'rgba(16, 185, 129, 0.3)' };
      case 'EXECUTION_STARTED':
      case 'STEP_STARTED':
        return { bg: 'rgba(56, 189, 248, 0.1)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.3)' };
      case 'RETRY_SCHEDULED':
      case 'RECOVERY_PERFORMED':
        return { bg: 'rgba(245, 158, 11, 0.1)', text: '#fbbf24', border: 'rgba(245, 158, 11, 0.3)' };
      case 'STEP_FAILED':
      case 'EXECUTION_FAILED':
      case 'EXECUTION_INTERRUPTED':
        return { bg: 'rgba(239, 68, 68, 0.1)', text: '#f87171', border: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Filter & Search Bar */}
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
        {/* Event Type Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <Filter size={14} style={{ color: '#8b949e', marginRight: '6px' }} />
          {eventTypes.map((et) => {
            const isActive = eventTypeFilter === et;
            return (
              <button
                key={et}
                onClick={() => {
                  setEventTypeFilter(et);
                  setPage(0);
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: isActive ? '1px solid #38bdf8' : '1px solid #21262d',
                  backgroundColor: isActive ? 'rgba(56, 189, 248, 0.12)' : '#161b22',
                  color: isActive ? '#38bdf8' : '#8b949e',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {et}
              </button>
            );
          })}
        </div>

        {/* Execution ID Search */}
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
            placeholder="Filter by Workflow ID..."
            value={executionIdSearch}
            onChange={(e) => {
              setExecutionIdSearch(e.target.value);
              setPage(0);
            }}
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

      {/* Global Events Table */}
      <Card noPadding>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d', backgroundColor: 'rgba(255, 255, 255, 0.015)' }}>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Event ID</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Event Type</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Workflow Execution ID</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Message</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Timestamp</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600, textAlign: 'right' }}>Payload</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => {
                const style = getEventBadgeColor(ev.eventType);
                return (
                  <tr
                    key={ev.id}
                    style={{
                      borderBottom: '1px solid #161b22',
                      transition: 'background-color 0.1s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.02)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#8b949e' }}>
                      #{ev.id}
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: style.bg,
                          color: style.text,
                          border: `1px solid ${style.border}`,
                          fontWeight: 600,
                          fontFamily: 'monospace',
                        }}
                      >
                        {ev.eventType}
                      </span>
                    </td>
                    <td
                      style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#38bdf8', cursor: 'pointer' }}
                      onClick={() => onSelectExecution(ev.workflowExecutionId)}
                      title="Inspect Execution"
                    >
                      {truncateId(ev.workflowExecutionId, 8, 4)}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#f0f6fc' }}>
                      {ev.message}
                    </td>
                    <td style={{ padding: '12px 18px', color: '#8b949e', fontFamily: 'monospace', fontSize: '0.74rem' }}>
                      {formatDateTime(ev.createdAt)}
                    </td>
                    <td style={{ padding: '12px 18px', textAlign: 'right' }}>
                      {ev.detailsJson && (
                        <button
                          onClick={() => onViewJson(`Event #${ev.id} Details`, ev.detailsJson)}
                          style={{
                            background: '#161b22',
                            border: '1px solid #30363d',
                            borderRadius: '4px',
                            color: '#c9d1d9',
                            padding: '3px 8px',
                            fontSize: '0.72rem',
                            cursor: 'pointer',
                          }}
                        >
                          <Code size={12} style={{ marginRight: '4px' }} />
                          <span>Details</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {events.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#6e7681' }}>
                    No audit events recorded for the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
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
            Showing {events.length} of {totalElements} audit events
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 0}
              style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '4px 8px',
                color: page <= 0 ? '#484f58' : '#c9d1d9',
                cursor: page <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <ChevronLeft size={14} />
            </button>
            <span style={{ fontFamily: 'monospace' }}>
              Page {page + 1} of {totalPages}
            </span>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages - 1}
              style={{
                background: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                padding: '4px 8px',
                color: page >= totalPages - 1 ? '#484f58' : '#c9d1d9',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
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

