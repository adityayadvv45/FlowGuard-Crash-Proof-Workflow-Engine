import React from 'react';
import {
  WorkflowStats,
  ExecutionResponse,
  SystemHealthResponse,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { ExecutionTrendChart } from '../../components/charts/ExecutionTrendChart';
import { StatusDistributionChart } from '../../components/charts/StatusDistributionChart';
import { formatDuration, formatDateTime, truncateId } from '../../utils/formatters';
import {
  Play,
  RotateCcw,
  Zap,
  Activity,
  Layers,
  CheckCircle2,
  AlertOctagon,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

interface OverviewPageProps {
  stats: WorkflowStats | null;
  executions: ExecutionResponse[];
  systemHealth: SystemHealthResponse | null;
  onSelectExecution: (id: string) => void;
  onNewOrder: () => void;
  onSimulateCrash: () => void;
  onNavigateToExecutions: () => void;
}

export const OverviewPage: React.FC<OverviewPageProps> = ({
  stats,
  executions,
  systemHealth,
  onSelectExecution,
  onNewOrder,
  onSimulateCrash,
  onNavigateToExecutions,
}) => {
  const recentFive = executions.slice(0, 5);

  const statCards = [
    {
      label: 'Total Executions',
      value: stats?.totalExecutions ?? 0,
      icon: Layers,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.1)',
    },
    {
      label: 'Active Running',
      value: stats?.runningExecutions ?? 0,
      icon: Activity,
      color: '#60a5fa',
      bg: 'rgba(96, 165, 250, 0.1)',
    },
    {
      label: 'Completed Safely',
      value: stats?.completedExecutions ?? 0,
      icon: CheckCircle2,
      color: '#10b981',
      bg: 'rgba(16, 185, 129, 0.1)',
    },
    {
      label: 'Failed / Terminal',
      value: stats?.failedExecutions ?? 0,
      icon: AlertOctagon,
      color: '#ef4444',
      bg: 'rgba(239, 68, 68, 0.1)',
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Metric Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '16px',
        }}
      >
        {statCards.map((c, i) => {
          const Icon = c.icon;
          return (
            <div
              key={i}
              style={{
                backgroundColor: '#0d1117',
                border: '1px solid #21262d',
                borderRadius: '10px',
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: '0.74rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  {c.label}
                </div>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: '#f0f6fc', fontFamily: 'monospace', marginTop: '4px' }}>
                  {c.value}
                </div>
              </div>
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  backgroundColor: c.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: c.color,
                }}
              >
                <Icon size={20} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Main 2-column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr',
          gap: '20px',
        }}
      >
        {/* Left Column: Trend & Status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Card
            title="Execution Duration Trend"
            subtitle="Recent completed execution latencies against statistical baseline"
          >
            <ExecutionTrendChart executions={executions} height={175} />
          </Card>

          <Card
            title="Execution Status Breakdown"
            subtitle="Distribution across terminal and intermediate workflow states"
          >
            {stats && <StatusDistributionChart stats={stats} />}
          </Card>
        </div>

        {/* Right Column: Engine Telemetry & Quick Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Quick Actions Card */}
          <Card
            title="Engine Operations"
            subtitle="Trigger and test durable execution lifecycle"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={onNewOrder}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#30363d')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Play size={16} style={{ color: '#10b981' }} />
                  <div>
                    <div>Execute Workflow</div>
                    <div style={{ fontSize: '0.70rem', color: '#8b949e', fontWeight: 400 }}>
                      Submit idempotent sequential order
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: '#8b949e' }} />
              </button>

              <button
                onClick={onSimulateCrash}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#ef4444')}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#30363d')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Zap size={16} style={{ color: '#f59e0b' }} />
                  <div>
                    <div>Inject Worker Crash</div>
                    <div style={{ fontSize: '0.70rem', color: '#8b949e', fontWeight: 400 }}>
                      Simulate node failure during payment step
                    </div>
                  </div>
                </div>
                <ArrowRight size={14} style={{ color: '#8b949e' }} />
              </button>
            </div>
          </Card>

          {/* Engine Health Card */}
          <Card
            title="Engine Telemetry"
            subtitle="Real-time worker pool and lease status"
            badge={
              <Badge
                status={systemHealth?.status === 'UP' ? 'COMPLETED' : 'RETRY_WAIT'}
                label={systemHealth?.status === 'UP' ? 'HEALTHY' : 'DEGRADED'}
                size="sm"
                pulse
              />
            }
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#8b949e' }}>Worker Node ID:</span>
                <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                  {systemHealth?.workerId || 'flowguard-worker-1'}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#8b949e' }}>Active Leases:</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 600 }}>
                  {systemHealth?.activeLeasesCount ?? 0} active
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#8b949e' }}>Queue Backlog:</span>
                <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                  {systemHealth?.workerQueueSize ?? 0} / {systemHealth?.workerQueueCapacity ?? 100}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.80rem' }}>
                <span style={{ color: '#8b949e' }}>Recovery Interval:</span>
                <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                  {systemHealth?.recoveryIntervalSeconds ?? 5}s
                </span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Bottom: Recent Executions */}
      <Card
        title="Recent Workflow Executions"
        subtitle="Latest dispatched workflows with live state and latency"
        action={
          <button
            onClick={onNavigateToExecutions}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              background: 'transparent',
              border: 'none',
              color: '#38bdf8',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <span>View All Executions</span>
            <ArrowRight size={13} />
          </button>
        }
        noPadding
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d', backgroundColor: 'rgba(255, 255, 255, 0.015)' }}>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Execution ID</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Duration</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Steps</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Created At</th>
              </tr>
            </thead>
            <tbody>
              {recentFive.map((e) => (
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
                  <td style={{ padding: '12px 18px' }}>
                    <Badge status={e.status} size="sm" pulse={e.status === 'RUNNING'} />
                  </td>
                  <td style={{ padding: '12px 18px', color: '#c9d1d9', fontFamily: 'monospace' }}>
                    {formatDuration(e.durationMillis)}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#8b949e' }}>
                    {e.steps.filter((s) => s.status === 'COMPLETED').length} / {e.steps.length}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#8b949e' }}>
                    {formatDateTime(e.createdAt)}
                  </td>
                </tr>
              ))}
              {recentFive.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '36px', textAlign: 'center', color: '#6e7681' }}>
                    No executions recorded yet. Click "Execute Workflow" to start your first run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

