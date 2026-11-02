import React, { useState, useEffect } from 'react';
import {
  ExecutionResponse,
  ExecutionEventResponse,
  AnomalyReport,
  StepExecution,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { fetchExecutionAnomaly, fetchEvents } from '../../services/api';
import {
  formatDuration,
  formatDateTime,
  truncateId,
  getSeverityStyle,
} from '../../utils/formatters';
import {
  ArrowLeft,
  RotateCcw,
  Ban,
  Trash2,
  Code,
  CheckCircle2,
  AlertCircle,
  PlayCircle,
  Clock,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  Cpu,
} from 'lucide-react';

interface ExecutionDetailPageProps {
  execution: ExecutionResponse;
  onBack: () => void;
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onDelete: (id: string) => void;
  onViewJson: (title: string, json: string | null) => void;
}

export const ExecutionDetailPage: React.FC<ExecutionDetailPageProps> = ({
  execution,
  onBack,
  onRetry,
  onCancel,
  onDelete,
  onViewJson,
}) => {
  const [anomalyReport, setAnomalyReport] = useState<AnomalyReport | null>(null);
  const [loadingAnomaly, setLoadingAnomaly] = useState(false);
  const [events, setEvents] = useState<ExecutionEventResponse[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [selectedStep, setSelectedStep] = useState<StepExecution | null>(
    execution.steps.length > 0 ? execution.steps[0] : null
  );

  useEffect(() => {
    let isMounted = true;
    setLoadingAnomaly(true);
    fetchExecutionAnomaly(execution.id)
      .then((res) => {
        if (isMounted) setAnomalyReport(res);
      })
      .catch(() => {
        // Silently handle if not ready or not found
      })
      .finally(() => {
        if (isMounted) setLoadingAnomaly(false);
      });

    setLoadingEvents(true);
    fetchEvents(execution.id)
      .then((res) => {
        if (isMounted) setEvents(res);
      })
      .catch(() => {})
      .finally(() => {
        if (isMounted) setLoadingEvents(false);
      });

    return () => {
      isMounted = false;
    };
  }, [execution.id]);

  const getStepStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 size={16} style={{ color: '#10b981' }} />;
      case 'RUNNING':
        return <PlayCircle size={16} style={{ color: '#38bdf8' }} />;
      case 'RETRY_WAIT':
        return <RotateCcw size={16} style={{ color: '#fbbf24' }} />;
      case 'FAILED':
        return <AlertCircle size={16} style={{ color: '#ef4444' }} />;
      default:
        return <Clock size={16} style={{ color: '#6e7681' }} />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Header Bar */}
      <div
        style={{
          padding: '16px 20px',
          backgroundColor: '#0d1117',
          border: '1px solid #21262d',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={onBack}
            style={{
              background: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '6px',
              padding: '6px 10px',
              color: '#c9d1d9',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.78rem',
            }}
          >
            <ArrowLeft size={14} />
            <span>Back to Executions</span>
          </button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.95rem', fontWeight: 600, color: '#f0f6fc', fontFamily: 'monospace' }}>
                {execution.id}
              </span>
              <Badge status={execution.status} pulse={execution.status === 'RUNNING'} />
            </div>
            <div style={{ fontSize: '0.74rem', color: '#8b949e', marginTop: '2px' }}>
              {execution.workflowName} • Version {execution.workflowVersion}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => onViewJson('Execution Input Payload', execution.inputJson)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '6px 12px',
              color: '#c9d1d9',
              fontSize: '0.76rem',
              cursor: 'pointer',
            }}
          >
            <Code size={13} />
            <span>Input JSON</span>
          </button>

          {execution.outputJson && (
            <button
              onClick={() => onViewJson('Execution Final Output', execution.outputJson)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '6px',
                padding: '6px 12px',
                color: '#c9d1d9',
                fontSize: '0.76rem',
                cursor: 'pointer',
              }}
            >
              <Code size={13} />
              <span>Output JSON</span>
            </button>
          )}

          {execution.status === 'FAILED' && (
            <button
              onClick={() => onRetry(execution.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                borderRadius: '6px',
                padding: '6px 14px',
                color: '#fbbf24',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <RotateCcw size={13} />
              <span>Retry Workflow</span>
            </button>
          )}

          {execution.status === 'RUNNING' && (
            <button
              onClick={() => onCancel(execution.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                backgroundColor: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.35)',
                borderRadius: '6px',
                padding: '6px 14px',
                color: '#f87171',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Ban size={13} />
              <span>Cancel</span>
            </button>
          )}

          <button
            onClick={() => onDelete(execution.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#161b22',
              border: '1px solid #30363d',
              borderRadius: '6px',
              padding: '6px 8px',
              color: '#8b949e',
              cursor: 'pointer',
            }}
            title="Delete Execution"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Metadata summary grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px',
        }}
      >
        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.70rem', color: '#8b949e', textTransform: 'uppercase' }}>Duration</div>
          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#f0f6fc', fontFamily: 'monospace', marginTop: '2px' }}>
            {formatDuration(execution.durationMillis)}
          </div>
        </div>
        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.70rem', color: '#8b949e', textTransform: 'uppercase' }}>Idempotency Key</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#c9d1d9', fontFamily: 'monospace', marginTop: '4px' }}>
            {execution.idempotencyKey || 'None (auto-generated)'}
          </div>
        </div>
        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.70rem', color: '#8b949e', textTransform: 'uppercase' }}>Started At</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#c9d1d9', marginTop: '4px' }}>
            {formatDateTime(execution.startedAt || execution.createdAt)}
          </div>
        </div>
        <div style={{ backgroundColor: '#0d1117', border: '1px solid #21262d', borderRadius: '8px', padding: '12px 16px' }}>
          <div style={{ fontSize: '0.70rem', color: '#8b949e', textTransform: 'uppercase' }}>Completed At</div>
          <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#c9d1d9', marginTop: '4px' }}>
            {formatDateTime(execution.completedAt)}
          </div>
        </div>
      </div>

      {/* Step Pipeline Stepper */}
      <Card
        title="Execution Step Pipeline"
        subtitle="Ordered sequential tasks executed with conditional worker leases"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${Math.max(1, execution.steps.length)}, 1fr)`,
            gap: '12px',
            marginBottom: '20px',
          }}
        >
          {execution.steps.map((s) => {
            const isSelected = selectedStep?.id === s.id;
            return (
              <div
                key={s.id}
                onClick={() => setSelectedStep(s)}
                style={{
                  padding: '14px 16px',
                  backgroundColor: isSelected ? '#161b22' : 'rgba(255, 255, 255, 0.02)',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #21262d',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.72rem', color: '#8b949e', fontWeight: 600 }}>
                    Step #{s.stepOrder}
                  </span>
                  {getStepStatusIcon(s.status)}
                </div>
                <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f6fc', marginBottom: '4px' }}>
                  {s.stepName || s.stepKey}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#8b949e', fontFamily: 'monospace' }}>
                  {formatDuration(s.durationMillis)} • Attempt {s.attemptCount}
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Step Deep Dive */}
        {selectedStep && (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#161b22',
              border: '1px solid #21262d',
              borderRadius: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f6fc' }}>
                  {selectedStep.stepName} ({selectedStep.stepKey})
                </span>
                <Badge status={selectedStep.status} size="sm" />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selectedStep.inputJson && (
                  <button
                    onClick={() => onViewJson(`Step #${selectedStep.stepOrder} Input`, selectedStep.inputJson)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      color: '#c9d1d9',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Step Input
                  </button>
                )}
                {selectedStep.outputJson && (
                  <button
                    onClick={() => onViewJson(`Step #${selectedStep.stepOrder} Output`, selectedStep.outputJson)}
                    style={{
                      background: 'transparent',
                      border: '1px solid #30363d',
                      borderRadius: '4px',
                      color: '#c9d1d9',
                      padding: '3px 8px',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                    }}
                  >
                    View Step Output
                  </button>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.76rem' }}>
              <div>
                <span style={{ color: '#8b949e' }}>Worker Lease Owner: </span>
                <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                  {selectedStep.workerLeaseOwner || 'Released'}
                </span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>Lease Until: </span>
                <span style={{ color: '#f0f6fc', fontFamily: 'monospace' }}>
                  {formatDateTime(selectedStep.workerLeaseUntil)}
                </span>
              </div>
              <div>
                <span style={{ color: '#8b949e' }}>Next Retry Window: </span>
                <span style={{ color: '#fbbf24', fontFamily: 'monospace' }}>
                  {formatDateTime(selectedStep.nextRetryAt)}
                </span>
              </div>
            </div>

            {selectedStep.errorMessage && (
              <div
                style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  backgroundColor: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '6px',
                  color: '#f87171',
                  fontSize: '0.76rem',
                  fontFamily: 'monospace',
                  lineHeight: 1.4,
                }}
              >
                <strong>Error: </strong> {selectedStep.errorMessage}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Backend Statistical Anomaly & Risk Report */}
      <Card
        title="Backend Execution Analytics & Risk Assessment"
        subtitle="Evaluated by com.flowguard.analytics using Welford standard deviation and IQR bounds"
        badge={
          anomalyReport ? (
            <Badge
              severity={anomalyReport.severity}
              label={anomalyReport.isAnomaly ? `ANOMALOUS (${anomalyReport.severity})` : 'NORMAL'}
              size="sm"
            />
          ) : undefined
        }
      >
        {loadingAnomaly && (
          <div style={{ color: '#8b949e', fontSize: '0.80rem' }}>
            Calculating execution features against baseline...
          </div>
        )}

        {!loadingAnomaly && anomalyReport && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                gap: '12px',
              }}
            >
              <div style={{ backgroundColor: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #21262d' }}>
                <div style={{ fontSize: '0.70rem', color: '#8b949e' }}>ANOMALY SCORE</div>
                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: anomalyReport.isAnomaly ? '#ef4444' : '#10b981', fontFamily: 'monospace' }}>
                  {(anomalyReport.anomalyScore * 100).toFixed(0)}%
                </div>
              </div>
              <div style={{ backgroundColor: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #21262d' }}>
                <div style={{ fontSize: '0.70rem', color: '#8b949e' }}>ANALYSIS STATUS</div>
                <div style={{ fontSize: '0.90rem', fontWeight: 600, color: '#f0f6fc', marginTop: '4px' }}>
                  {anomalyReport.status}
                </div>
              </div>
              <div style={{ backgroundColor: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #21262d' }}>
                <div style={{ fontSize: '0.70rem', color: '#8b949e' }}>MODEL ARCHITECTURE</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 500, color: '#38bdf8', marginTop: '4px' }}>
                  {anomalyReport.modelType}
                </div>
              </div>
              <div style={{ backgroundColor: '#161b22', padding: '12px', borderRadius: '8px', border: '1px solid #21262d' }}>
                <div style={{ fontSize: '0.70rem', color: '#8b949e' }}>RETRY ELIGIBILITY</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fbbf24', marginTop: '4px' }}>
                  {anomalyReport.riskAssessment?.retryEligibility || 'N/A'}
                </div>
              </div>
            </div>

            {/* Explanation Note */}
            <div style={{ fontSize: '0.78rem', color: '#c9d1d9', lineHeight: 1.5 }}>
              {anomalyReport.explanation}
            </div>

            {/* Contributing Features Table */}
            {anomalyReport.contributingFeatures.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.76rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #21262d', color: '#8b949e' }}>
                      <th style={{ padding: '8px 12px' }}>Feature</th>
                      <th style={{ padding: '8px 12px' }}>Observed</th>
                      <th style={{ padding: '8px 12px' }}>Baseline Mean</th>
                      <th style={{ padding: '8px 12px' }}>Std Dev</th>
                      <th style={{ padding: '8px 12px' }}>Deviation</th>
                      <th style={{ padding: '8px 12px' }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {anomalyReport.contributingFeatures.map((f, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #161b22' }}>
                        <td style={{ padding: '8px 12px', color: '#f0f6fc', fontWeight: 500 }}>{f.featureName}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#c9d1d9' }}>{f.observedValue}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#8b949e' }}>{f.baselineMean.toFixed(1)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: '#8b949e' }}>{f.baselineStdDev.toFixed(1)}</td>
                        <td style={{ padding: '8px 12px', fontFamily: 'monospace', color: f.outlier ? '#f87171' : '#34d399' }}>
                          {(f.deviationScore * 100).toFixed(0)}%
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {f.outlier ? (
                            <span style={{ color: '#ef4444', fontWeight: 600 }}>OUTLIER</span>
                          ) : (
                            <span style={{ color: '#10b981' }}>NORMAL</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Execution Audit Log */}
      <Card
        title="Execution Audit Log"
        subtitle="Chronological event history recorded to PostgreSQL execution_events table"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {events.map((ev) => (
            <div
              key={ev.id}
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                padding: '8px 12px',
                backgroundColor: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid #21262d',
                borderRadius: '6px',
                fontSize: '0.76rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: '0.70rem',
                    color: '#38bdf8',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  }}
                >
                  {ev.eventType}
                </span>
                <span style={{ color: '#f0f6fc' }}>{ev.message}</span>
              </div>
              <span style={{ color: '#6e7681', fontFamily: 'monospace', fontSize: '0.70rem' }}>
                {formatDateTime(ev.createdAt)}
              </span>
            </div>
          ))}
          {events.length === 0 && !loadingEvents && (
            <div style={{ color: '#6e7681', fontSize: '0.78rem', textAlign: 'center', padding: '20px' }}>
              No audit events found for this execution.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};
