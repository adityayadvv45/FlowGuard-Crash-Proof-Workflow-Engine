import React from 'react';
import { WorkflowStats } from '../../types';

interface StatusDistributionChartProps {
  stats: WorkflowStats;
}

export const StatusDistributionChart: React.FC<StatusDistributionChartProps> = ({ stats }) => {
  const total = Math.max(1, stats.totalExecutions);

  const completedPct = ((stats.completedExecutions / total) * 100);
  const runningPct = ((stats.runningExecutions / total) * 100);
  const failedPct = ((stats.failedExecutions / total) * 100);
  const pendingPct = ((stats.pendingExecutions / total) * 100);

  const segments = [
    { label: 'Completed', count: stats.completedExecutions, pct: completedPct, color: '#10b981' },
    { label: 'Running', count: stats.runningExecutions, pct: runningPct, color: '#38bdf8' },
    { label: 'Failed', count: stats.failedExecutions, pct: failedPct, color: '#ef4444' },
    { label: 'Pending', count: stats.pendingExecutions, pct: pendingPct, color: '#64748b' },
  ];

  return (
    <div>
      {/* Multi-segment progress bar */}
      <div
        style={{
          display: 'flex',
          height: '10px',
          borderRadius: '9999px',
          overflow: 'hidden',
          backgroundColor: '#21262d',
          marginBottom: '16px',
        }}
      >
        {segments.map((seg) => {
          if (seg.pct <= 0) return null;
          return (
            <div
              key={seg.label}
              style={{
                width: `${seg.pct}%`,
                backgroundColor: seg.color,
                transition: 'width 0.4s ease',
              }}
              title={`${seg.label}: ${seg.count} (${seg.pct.toFixed(1)}%)`}
            />
          );
        })}
      </div>

      {/* Legend & Count Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
          gap: '12px',
        }}
      >
        {segments.map((seg) => (
          <div
            key={seg.label}
            style={{
              padding: '10px 12px',
              backgroundColor: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid #21262d',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span
                style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: seg.color,
                }}
              />
              <span style={{ fontSize: '0.72rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {seg.label}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f0f6fc', fontFamily: 'monospace' }}>
                {seg.count}
              </span>
              <span style={{ fontSize: '0.70rem', color: '#6e7681' }}>
                {stats.totalExecutions > 0 ? `${seg.pct.toFixed(1)}%` : '0%'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
