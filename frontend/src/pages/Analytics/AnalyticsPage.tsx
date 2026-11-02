import React, { useState, useEffect } from 'react';
import {
  AnalyticsSummaryResponse,
  AnomalyReport,
  SimulationRequest,
} from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import {
  fetchAnalyticsSummary,
  fetchRecentAnomalies,
  simulateAnalytics,
} from '../../services/api';
import {
  formatDuration,
  formatDateTime,
  truncateId,
  getSeverityStyle,
} from '../../utils/formatters';
import {
  BarChart3,
  Cpu,
  AlertTriangle,
  Play,
  CheckCircle2,
  RefreshCw,
  Sliders,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

interface AnalyticsPageProps {
  onSelectExecution: (id: string) => void;
}

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ onSelectExecution }) => {
  const [summary, setSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [recentReports, setRecentReports] = useState<AnomalyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // Simulation Playground State
  const [simAmount, setSimAmount] = useState<number>(250);
  const [simAttempts, setSimAttempts] = useState<number>(1);
  const [simErrorType, setSimErrorType] = useState<string>('NONE');
  const [simulationResult, setSimulationResult] = useState<AnomalyReport | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [sum, rec] = await Promise.all([
        fetchAnalyticsSummary(),
        fetchRecentAnomalies(30),
      ]);
      setSummary(sum);
      setRecentReports(rec);
    } catch {
      // Graceful fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRunSimulation = async () => {
    try {
      setIsSimulating(true);
      const req: SimulationRequest = {
        amount: simAmount,
        attemptCount: simAttempts,
        errorType: simErrorType === 'NONE' ? undefined : simErrorType,
      };
      const res = await simulateAnalytics(req);
      setSimulationResult(res);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
    }
  };

  const baseline = summary?.baseline;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Statistical Baseline Banner */}
      <Card
        title="Statistical Baseline Telemetry"
        subtitle="Computed from historical workflow executions using Welford's algorithm and IQR bounds"
        badge={
          <Badge
            status={summary?.engineHealth === 'HEALTHY' ? 'COMPLETED' : 'RETRY_WAIT'}
            label={summary?.engineHealth || 'EVALUATED'}
            size="sm"
          />
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '14px',
          }}
        >
          <div style={{ backgroundColor: '#161b22', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Baseline Samples</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f0f6fc', fontFamily: 'monospace', marginTop: '3px' }}>
              {baseline?.sampleSize ?? 0}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e7681', marginTop: '2px' }}>N ≥ 5 for full confidence</div>
          </div>

          <div style={{ backgroundColor: '#161b22', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Mean Duration</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#38bdf8', fontFamily: 'monospace', marginTop: '3px' }}>
              {formatDuration(baseline?.meanDurationMs)}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e7681', marginTop: '2px' }}>
              σ = {baseline?.stdDevDurationMs ? `${Math.round(baseline.stdDevDurationMs)}ms` : '—'}
            </div>
          </div>

          <div style={{ backgroundColor: '#161b22', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Median Duration</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#c9d1d9', fontFamily: 'monospace', marginTop: '3px' }}>
              {formatDuration(baseline?.medianDurationMs)}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e7681', marginTop: '2px' }}>
              IQR = {baseline?.iqrDurationMs ? `${Math.round(baseline.iqrDurationMs)}ms` : '—'}
            </div>
          </div>

          <div style={{ backgroundColor: '#161b22', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Anomaly Rate</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24', fontFamily: 'monospace', marginTop: '3px' }}>
              {summary?.anomalyRatePercent ?? 0}%
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e7681', marginTop: '2px' }}>
              {summary?.anomaliesDetected ?? 0} of {summary?.totalExecutionsAnalyzed ?? 0}
            </div>
          </div>

          <div style={{ backgroundColor: '#161b22', padding: '12px 14px', borderRadius: '8px', border: '1px solid #21262d' }}>
            <div style={{ fontSize: '0.68rem', color: '#8b949e', textTransform: 'uppercase' }}>Avg Anomaly Score</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#f87171', fontFamily: 'monospace', marginTop: '3px' }}>
              {summary?.averageAnomalyScore ? `${(summary.averageAnomalyScore * 100).toFixed(0)}%` : '0%'}
            </div>
            <div style={{ fontSize: '0.68rem', color: '#6e7681', marginTop: '2px' }}>Compound Risk Index</div>
          </div>
        </div>
      </Card>

      {/* 2-Column: Simulation Playground on Left, Severity Breakdown on Right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 0.9fr',
          gap: '20px',
        }}
      >
        {/* Simulation Playground */}
        <Card
          title="Statistical Anomaly Simulation Playground"
          subtitle="Test hypothesis feature vectors against production baselines without persisting fake runs"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                Order Amount ($):
              </label>
              <input
                type="number"
                value={simAmount}
                onChange={(e) => setSimAmount(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                Step Attempt Count (Retry Depth):
              </label>
              <select
                value={simAttempts}
                onChange={(e) => setSimAttempts(Number(e.target.value))}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                }}
              >
                <option value={1}>1 Attempt (Normal single execution)</option>
                <option value={2}>2 Attempts (1 Transient retry)</option>
                <option value={3}>3 Attempts (2 Retries / Near threshold)</option>
                <option value={4}>4 Attempts (Exceeded max attempts)</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', color: '#8b949e', display: 'block', marginBottom: '4px' }}>
                Simulated Downstream Error Condition:
              </label>
              <select
                value={simErrorType}
                onChange={(e) => setSimErrorType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  backgroundColor: '#161b22',
                  border: '1px solid #30363d',
                  borderRadius: '6px',
                  color: '#f0f6fc',
                  fontSize: '0.82rem',
                }}
              >
                <option value="NONE">None (Clean completion)</option>
                <option value="TIMEOUT">Downstream Gateway 504 Timeout</option>
                <option value="CRASH">Worker SIGKILL / Expired Lease</option>
                <option value="PERMANENT">Business Rule / Insufficient Funds</option>
              </select>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={isSimulating}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 16px',
                backgroundColor: '#238636',
                border: '1px solid rgba(240, 246, 252, 0.1)',
                borderRadius: '6px',
                color: '#ffffff',
                fontSize: '0.80rem',
                fontWeight: 600,
                cursor: isSimulating ? 'not-allowed' : 'pointer',
                marginTop: '4px',
              }}
            >
              <Play size={14} fill="#ffffff" />
              <span>{isSimulating ? 'Evaluating...' : 'Simulate Anomaly Vector'}</span>
            </button>

            {/* Simulation Preview Result */}
            {simulationResult && (
              <div
                style={{
                  padding: '14px',
                  backgroundColor: '#161b22',
                  border: '1px solid #21262d',
                  borderRadius: '8px',
                  marginTop: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#f0f6fc' }}>
                    Simulation Output
                  </span>
                  <Badge severity={simulationResult.severity} size="sm" />
                </div>
                <div style={{ fontSize: '0.74rem', color: '#c9d1d9', lineHeight: 1.4 }}>
                  {simulationResult.explanation}
                </div>
                <div style={{ marginTop: '8px', fontSize: '0.70rem', color: '#8b949e' }}>
                  <strong>Risk Policy: </strong>{simulationResult.riskAssessment?.recommendation}
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Severity Distribution & Reason Codes */}
        <Card
          title="Observed Anomaly Breakdown"
          subtitle="Severity distribution and triggered statistical reason codes"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((sev) => {
                const count = summary?.severityBreakdown?.[sev] || 0;
                const style = getSeverityStyle(sev);
                return (
                  <div
                    key={sev}
                    style={{
                      padding: '12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid #21262d',
                      borderRadius: '8px',
                    }}
                  >
                    <div style={{ fontSize: '0.70rem', color: style.text, fontWeight: 600 }}>{sev}</div>
                    <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f0f6fc', fontFamily: 'monospace', marginTop: '2px' }}>
                      {count}
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <div style={{ fontSize: '0.74rem', color: '#8b949e', textTransform: 'uppercase', marginBottom: '8px' }}>
                Triggered Anomaly Codes
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {Object.entries(summary?.reasonCodeCounts || {}).map(([code, cnt]) => (
                  <span
                    key={code}
                    style={{
                      fontSize: '0.72rem',
                      fontFamily: 'monospace',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: '#161b22',
                      border: '1px solid #30363d',
                      color: '#c9d1d9',
                    }}
                  >
                    {code} ({cnt})
                  </span>
                ))}
                {Object.keys(summary?.reasonCodeCounts || {}).length === 0 && (
                  <span style={{ fontSize: '0.74rem', color: '#6e7681' }}>
                    No recurring anomaly codes recorded in current sample.
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Evaluations Table */}
      <Card
        title="Recent Execution Risk Assessments"
        subtitle="Individual workflow runs scored by AnomalyDetectionService"
        noPadding
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.80rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #21262d', backgroundColor: 'rgba(255, 255, 255, 0.015)' }}>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Execution ID</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Score</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Severity</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Reason Codes</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Retry Recommendation</th>
                <th style={{ padding: '12px 18px', color: '#8b949e', fontWeight: 600 }}>Analyzed At</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.map((r) => (
                <tr
                  key={r.executionId}
                  onClick={() => onSelectExecution(r.executionId)}
                  style={{
                    borderBottom: '1px solid #161b22',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(ev) => (ev.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)')}
                  onMouseLeave={(ev) => (ev.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 600 }}>
                    {truncateId(r.executionId, 8, 4)}
                  </td>
                  <td style={{ padding: '12px 18px', fontFamily: 'monospace', color: r.isAnomaly ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                    {(r.anomalyScore * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '12px 18px' }}>
                    <Badge severity={r.severity} size="sm" />
                  </td>
                  <td style={{ padding: '12px 18px', color: '#c9d1d9', fontSize: '0.74rem' }}>
                    {r.reasonCodes.length > 0 ? r.reasonCodes.join(', ') : 'NOMINAL_BASELINE'}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#8b949e', fontSize: '0.74rem' }}>
                    {r.riskAssessment?.retryEligibility || 'NORMAL'}
                  </td>
                  <td style={{ padding: '12px 18px', color: '#8b949e' }}>
                    {formatDateTime(r.analyzedAt)}
                  </td>
                </tr>
              ))}
              {recentReports.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '36px', textAlign: 'center', color: '#6e7681' }}>
                    No evaluations available yet.
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
