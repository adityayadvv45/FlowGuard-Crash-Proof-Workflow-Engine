import React from 'react';
import { ExecutionEventResponse } from '../types';
import { Terminal } from 'lucide-react';

interface EventsAuditLogProps {
  events: ExecutionEventResponse[];
  onViewJson: (title: string, json: string | null) => void;
}

export const EventsAuditLog: React.FC<EventsAuditLogProps> = ({ events, onViewJson }) => {
  return (
    <div className="table-card">
      <div className="section-header" style={{ marginBottom: '16px' }}>
        <div className="section-title">
          <Terminal size={18} color="#a855f7" />
          <span>PostgreSQL Audit Event Trail</span>
        </div>
        <span style={{ fontSize: '12px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
          {events.length} Events (Append-Only)
        </span>
      </div>

      {events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontSize: '13px' }}>
          No events recorded for this execution.
        </div>
      ) : (
        <div className="events-list">
          {events.map((evt) => (
            <div key={evt.id} className={`event-item event-${evt.eventType}`}>
              <div className="event-top">
                <span className="event-type">{evt.eventType}</span>
                <span className="event-time">
                  {new Date(evt.createdAt).toLocaleTimeString()}
                </span>
              </div>
              <div className="event-msg">{evt.message}</div>
              {evt.detailsJson && (
                <div style={{ marginTop: '4px' }}>
                  <button
                    className="btn btn-secondary"
                    style={{ padding: '2px 8px', fontSize: '10px' }}
                    onClick={() => onViewJson(`Event Details: ${evt.eventType}`, evt.detailsJson)}
                  >
                    View Details JSON
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
