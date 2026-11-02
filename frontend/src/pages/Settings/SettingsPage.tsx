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
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
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
            Production tuning parameters for worker contention, recovery sweeps, and observability endpoints
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

        {/* Developer / Internship Portfolio Profile */}
        <Card title="Engineer Profile & Project Context">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#38bdf8',
                }}
              >
                <User size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f6fc' }}>
                  Aditya Kumar
                </div>
                <div style={{ fontSize: '0.74rem', color: '#8b949e' }}>
                  Java Backend Engineer / SDE Internship Portfolio
                </div>
              </div>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#8b949e', lineHeight: 1.5, margin: '4px 0 0 0' }}>
              FlowGuard is a durable workflow orchestration engine engineered in Java 21 & Spring Boot 3.3.
              It implements atomic conditional step claiming in PostgreSQL, crash-recovery sweepers, exponential retry backoff with jitter, SHA-256 idempotency, and statistical anomaly detection.
            </p>
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
