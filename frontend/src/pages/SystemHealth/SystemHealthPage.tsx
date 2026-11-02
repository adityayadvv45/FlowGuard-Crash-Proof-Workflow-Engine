import React from 'react';
import { SystemHealthResponse } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { formatDuration } from '../../utils/formatters';
import {
  Cpu,
  Server,
  Database,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  HardDrive,
} from 'lucide-react';

interface SystemHealthPageProps {
  systemHealth: SystemHealthResponse | null;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const SystemHealthPage: React.FC<SystemHealthPageProps> = ({
  systemHealth,
  onRefresh,
  isRefreshing,
}) => {
  const queuePct = systemHealth
    ? Math.round((systemHealth.workerQueueSize / (systemHealth.workerQueueCapacity || 100)) * 100)
    : 0;

  const heapPct = systemHealth && systemHealth.heapMaxMb > 0
    ? Math.round((systemHealth.heapUsedMb / systemHealth.heapMaxMb) * 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner */}
      <div
        style={{
          padding: '20px 24px',
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f0f6fc', margin: 0 }}>
              Engine Health & Runtime Telemetry
            </h2>
            <Badge
              status={systemHealth?.status === 'UP' ? 'COMPLETED' : 'RETRY_WAIT'}
              label={systemHealth?.status === 'UP' ? 'ALL SYSTEMS OPERATIONAL' : 'DEGRADED'}
              pulse
            />
          </div>
          <p style={{ fontSize: '0.80rem', color: '#8b949e', margin: '4px 0 0 0' }}>
            Live status of PostgreSQL connection pool, worker task queue, and distributed lease sweepers
          </p>
        </div>
      </div>

      {/* Primary Telemetry Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '16px',
        }}
      >
        {/* Node & Database */}
        <Card title="Database & Node Identity">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>PostgreSQL Connection:</span>
              <span style={{ color: systemHealth?.databaseStatus === 'CONNECTED' ? '#10b981' : '#ef4444', fontWeight: 600 }}>
                {systemHealth?.databaseStatus || 'CONNECTED'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Worker Node ID:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                {systemHealth?.workerId || 'flowguard-worker-1'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Process Uptime:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>
                {formatDuration(systemHealth?.uptimeMillis)}
              </span>
            </div>
          </div>
        </Card>

        {/* Worker Pool Utilization */}
        <Card title="Worker Thread Pool & Queue">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Active Worker Threads:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace', fontWeight: 600 }}>
                {systemHealth?.activeWorkers ?? 0} / {systemHealth?.workerPoolSize ?? 16}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Task Queue Backlog:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                {systemHealth?.workerQueueSize ?? 0} / {systemHealth?.workerQueueCapacity ?? 100} ({queuePct}%)
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '9999px', backgroundColor: '#21262d', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(5, queuePct)}%`, height: '100%', backgroundColor: queuePct > 80 ? '#ef4444' : '#38bdf8' }} />
            </div>
          </div>
        </Card>

        {/* Leases & Recovery Sweepers */}
        <Card title="Distributed Lease Manager">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Active Step Leases:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace', fontWeight: 700 }}>
                {systemHealth?.activeLeasesCount ?? 0} held
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Lease Expiry Duration:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                {systemHealth?.leaseDurationSeconds ?? 10} seconds
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Recovery Sweep Frequency:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                Every {systemHealth?.recoveryIntervalSeconds ?? 5}s
              </span>
            </div>
          </div>
        </Card>

        {/* JVM Memory */}
        <Card title="JVM Memory Allocation">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Heap Used:</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                {systemHealth?.heapUsedMb ?? 0} MB
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
              <span style={{ color: '#8b949e' }}>Heap Committed Max:</span>
              <span style={{ color: '#8b949e', fontFamily: 'monospace' }}>
                {systemHealth?.heapMaxMb ?? 0} MB ({heapPct}%)
              </span>
            </div>
            <div style={{ height: '6px', borderRadius: '9999px', backgroundColor: '#21262d', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(5, heapPct)}%`, height: '100%', backgroundColor: '#10b981' }} />
            </div>
          </div>
        </Card>
      </div>

      {/* High-Level Architecture Flow Diagram */}
      <Card
        title="Durable Execution & Concurrency Architecture"
        subtitle="How FlowGuard prevents duplicate executions, race conditions, and orphaned states"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '16px',
            marginTop: '8px',
          }}
        >
          <div
            style={{
              padding: '16px',
              backgroundColor: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', marginBottom: '8px' }}>
              <ShieldCheck size={18} />
              <strong style={{ fontSize: '0.84rem' }}>1. Atomic Step Locking</strong>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#8b949e', lineHeight: 1.5, margin: 0 }}>
              Conditional UPDATE SQL with `WHERE locked_by IS NULL` prevents concurrent workers from double-claiming eligible steps.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#fbbf24', marginBottom: '8px' }}>
              <Clock size={18} />
              <strong style={{ fontSize: '0.84rem' }}>2. Lease Expiration Sweep</strong>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#8b949e', lineHeight: 1.5, margin: 0 }}>
              If a JVM process crashes mid-step, `RecoveryService` automatically unlocks expired leases and reschedules pending steps.
            </p>
          </div>

          <div
            style={{
              padding: '16px',
              backgroundColor: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', marginBottom: '8px' }}>
              <CheckCircle2 size={18} />
              <strong style={{ fontSize: '0.84rem' }}>3. SHA-256 Idempotency</strong>
            </div>
            <p style={{ fontSize: '0.76rem', color: '#8b949e', lineHeight: 1.5, margin: 0 }}>
              Duplicate HTTP client submissions with identical idempotency keys return the existing execution state immediately without re-executing steps.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

