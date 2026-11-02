import React from 'react';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  Sliders,
  ExternalLink,
  ShieldCheck,
  User,
  Github,
  Server,
  Layers,
  FileCode,
  LogIn,
  Key,
} from 'lucide-react';
import { UserAccount } from '../../types';
import { formatDateTime, truncateId } from '../../utils/formatters';

interface SettingsPageProps {
  currentUser?: UserAccount | null;
  onOpenAuth?: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  currentUser,
  onOpenAuth,
}) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
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
          <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: '#f0f6fc', margin: 0 }}>
            Engine Settings & System Parameters
          </h2>
          <p style={{ fontSize: '0.80rem', color: '#8b949e', margin: '4px 0 0 0' }}>
            Production tuning parameters for worker contention, recovery sweeps, and account management
          </p>
        </div>
      </div>

      {/* 2-Column Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* User Account Details Card */}
        <Card
          title="Account Details & Authentication"
          subtitle="Signed in profile and credentials stored in PostgreSQL"
          action={
            <button
              onClick={onOpenAuth}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '4px 10px',
                color: '#38bdf8',
                fontSize: '0.74rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {currentUser ? <User size={13} /> : <LogIn size={13} />}
              <span>{currentUser ? 'Manage Account' : 'Sign In / Register'}</span>
            </button>
          }
        >
          {currentUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.80rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: '1px solid #161b22' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    fontSize: '1rem',
                    color: '#ffffff',
                  }}
                >
                  {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f6fc' }}>
                    {currentUser.fullName}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#8b949e' }}>
                    @{currentUser.username} • {currentUser.email}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#8b949e' }}>Role</span>
                <span style={{ color: '#f0f6fc', fontWeight: 500 }}>{currentUser.role}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#8b949e' }}>Account ID</span>
                <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>{currentUser.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ color: '#8b949e' }}>Registered On</span>
                <span style={{ color: '#c9d1d9' }}>{formatDateTime(currentUser.createdAt)}</span>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '20px 0', color: '#8b949e', fontSize: '0.80rem' }}>
              No user currently signed in. Click "Sign In / Register" to access your account.
            </div>
          )}
        </Card>

        {/* Engine Parameters */}
        <Card title="Workflow Engine Configuration">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Worker Lease Timeout</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>10 seconds</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Recovery Sweeper Polling Interval</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>5 seconds</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Retry Poll Interval</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>2 seconds</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Maximum Step Retry Attempts</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>3 attempts</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Exponential Backoff Multiplier</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>2.0x (with 0.2 jitter)</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#8b949e' }}>Worker Pool Sizing</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>4 Core / 16 Max / 100 Queue</span>
            </div>
          </div>
        </Card>

        {/* Statistical Analytics Parameters */}
        <Card title="Statistical Anomaly Detection Tuning">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.82rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Minimum Baseline Samples (N)</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>5 executions</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Z-Score Outlier Threshold</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>Z ≥ 2.5</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>IQR Outlier Threshold</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>Q3 + 2.0 × IQR</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #161b22' }}>
              <span style={{ color: '#8b949e' }}>Variance Algorithm</span>
              <span style={{ color: '#38bdf8', fontFamily: 'monospace' }}>Welford's Single-Pass</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span style={{ color: '#8b949e' }}>Baseline Cache Invalidation</span>
              <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>15 seconds</span>
            </div>
          </div>
        </Card>

        {/* Endpoints & Links */}
        <Card title="API Endpoints & Developer Tools">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <a
              href="/swagger-ui/index.html"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#f0f6fc',
                textDecoration: 'none',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileCode size={15} style={{ color: '#38bdf8' }} />
                <span>OpenAPI / Swagger UI Docs</span>
              </div>
              <ExternalLink size={13} style={{ color: '#8b949e' }} />
            </a>

            <a
              href="/actuator/prometheus"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#f0f6fc',
                textDecoration: 'none',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Server size={15} style={{ color: '#10b981' }} />
                <span>Micrometer Prometheus Metrics</span>
              </div>
              <ExternalLink size={13} style={{ color: '#8b949e' }} />
            </a>

            <a
              href="https://github.com/adityayadvv45/FlowGuard-Crash-Proof-Workflow-Engine"
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                backgroundColor: '#161b22',
                border: '1px solid #21262d',
                borderRadius: '6px',
                color: '#f0f6fc',
                textDecoration: 'none',
                fontSize: '0.78rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Github size={15} style={{ color: '#c9d1d9' }} />
                <span>GitHub Repository</span>
              </div>
              <ExternalLink size={13} style={{ color: '#8b949e' }} />
            </a>
          </div>
        </Card>
      </div>
    </div>
  );
};
