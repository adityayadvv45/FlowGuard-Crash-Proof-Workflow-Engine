import React, { useState } from 'react';
import { WorkflowDefinition } from '../../types';
import { Card } from '../../components/common/Card';
import { Badge } from '../../components/common/Badge';
import { Play, Code, CheckCircle, Shield, ArrowRight, Layers } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

interface WorkflowsPageProps {
  workflows: WorkflowDefinition[];
  onLaunchWorkflow: (workflowId: string) => void;
  onViewJson: (title: string, json: string | null) => void;
}

export const WorkflowsPage: React.FC<WorkflowsPageProps> = ({
  workflows,
  onLaunchWorkflow,
  onViewJson,
}) => {
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string | null>(
    workflows.length > 0 ? workflows[0].id : null
  );

  const activeWorkflow = workflows.find((w) => w.id === selectedWorkflowId) || workflows[0];

  // Parse definition JSON steps if possible
  let parsedSteps: any[] = [];
  try {
    if (activeWorkflow?.definitionJson) {
      const parsed = JSON.parse(activeWorkflow.definitionJson);
      parsedSteps = parsed.steps || [];
    }
  } catch {
    parsedSteps = [];
  }

  // Fallback default 4 steps if empty
  if (parsedSteps.length === 0) {
    parsedSteps = [
      { order: 1, key: 'VALIDATE_ORDER', name: 'Validate Order & Customer' },
      { order: 2, key: 'PROCESS_PAYMENT', name: 'Charge Payment Gateway' },
      { order: 3, key: 'UPDATE_INVENTORY', name: 'Deduct Catalog Stock' },
      { order: 4, key: 'SEND_NOTIFICATION', name: 'Dispatch Customer Receipt' },
    ];
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header banner */}
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
            Registered Workflow Catalog
          </h2>
          <p style={{ fontSize: '0.82rem', color: '#8b949e', margin: '4px 0 0 0' }}>
            Declarative state machines registered in PostgreSQL with step-level leases and exponential backoff
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge status="COMPLETED" label={`${workflows.length} Active Workflows`} />
        </div>
      </div>

      {/* 2-column layout: Workflow list on left, detail view on right */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '20px',
        }}
      >
        {/* Left Column: Workflow List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {workflows.map((wf) => {
            const isSelected = wf.id === (activeWorkflow?.id || selectedWorkflowId);
            return (
              <div
                key={wf.id}
                onClick={() => setSelectedWorkflowId(wf.id)}
                style={{
                  padding: '16px',
                  backgroundColor: isSelected ? '#161b22' : '#0d1117',
                  border: isSelected ? '1px solid #38bdf8' : '1px solid #21262d',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f0f6fc' }}>
                    {wf.name}
                  </span>
                  <span
                    style={{
                      fontSize: '0.68rem',
                      color: '#38bdf8',
                      backgroundColor: 'rgba(56, 189, 248, 0.12)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      fontFamily: 'monospace',
                    }}
                  >
                    v{wf.version}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.76rem',
                    color: '#8b949e',
                    margin: '6px 0 10px 0',
                    lineHeight: 1.4,
                  }}
                >
                  {wf.description}
                </p>
                <div style={{ fontSize: '0.70rem', color: '#6e7681' }}>
                  Registered: {formatDateTime(wf.createdAt)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Active Workflow Inspector */}
        {activeWorkflow && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <Card
              title={activeWorkflow.name}
              subtitle={activeWorkflow.description}
              action={
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => onViewJson('Workflow Definition JSON', activeWorkflow.definitionJson)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#161b22',
                      border: '1px solid #30363d',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      color: '#c9d1d9',
                      fontSize: '0.78rem',
                      fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    <Code size={14} />
                    <span>View JSON Schema</span>
                  </button>

                  <button
                    onClick={() => onLaunchWorkflow(activeWorkflow.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#238636',
                      border: '1px solid rgba(240, 246, 252, 0.1)',
                      borderRadius: '6px',
                      padding: '6px 14px',
                      color: '#ffffff',
                      fontSize: '0.78rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    <Play size={14} fill="#ffffff" />
                    <span>Launch Execution</span>
                  </button>
                </div>
              }
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Pipeline Steps Sequence */}
                <div>
                  <h4 style={{ fontSize: '0.84rem', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 12px 0' }}>
                    Execution Pipeline Sequence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {parsedSteps.map((s, idx) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: '#161b22',
                          border: '1px solid #21262d',
                          borderRadius: '8px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span
                            style={{
                              width: '24px',
                              height: '24px',
                              borderRadius: '50%',
                              backgroundColor: 'rgba(56, 189, 248, 0.15)',
                              color: '#38bdf8',
                              fontSize: '0.76rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontFamily: 'monospace',
                            }}
                          >
                            {s.order || idx + 1}
                          </span>
                          <div>
                            <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#f0f6fc' }}>
                              {s.name || s.stepKey}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#8b949e', fontFamily: 'monospace' }}>
                              {s.key || s.stepKey}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: '#8b949e',
                              backgroundColor: 'rgba(255, 255, 255, 0.03)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #21262d',
                            }}
                          >
                            Max 3 Attempts
                          </span>
                          <span
                            style={{
                              fontSize: '0.72rem',
                              color: '#10b981',
                              backgroundColor: 'rgba(16, 185, 129, 0.1)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                            }}
                          >
                            Atomic Claim
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Engine Reliability Guarantees */}
                <div
                  style={{
                    padding: '16px',
                    backgroundColor: 'rgba(56, 189, 248, 0.04)',
                    border: '1px solid rgba(56, 189, 248, 0.2)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                  }}
                >
                  <Shield size={20} style={{ color: '#38bdf8', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#38bdf8' }}>
                      Engine Crash-Proof Guarantees
                    </div>
                    <p style={{ fontSize: '0.76rem', color: '#8b949e', margin: '4px 0 0 0', lineHeight: 1.5 }}>
                      Each step executes with atomic database conditional locking (`UPDATE step_executions WHERE locked_by IS NULL`). 
                      If a worker crashes mid-step, its lease expires in 10s and `RecoveryService` reclaims the task with zero orphaned states or duplicate side-effects.
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
