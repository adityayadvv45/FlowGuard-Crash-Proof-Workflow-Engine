import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Layers,
  ListOrdered,
  CheckSquare,
  Calendar,
  Settings,
  Play,
  Plus,
  Flame,
  RefreshCcw,
  ShoppingCart,
  CreditCard,
  Package,
  Mail,
  ArrowRight,
  FileText,
  Brain,
  X,
  RotateCcw,
  Trash2,
  Search,
  Clock,
  User,
  Activity,
  Sliders,
  Cpu,
  ShoppingBag,
  Check,
  Zap,
} from 'lucide-react';
import {
  ExecutionEventResponse,
  ExecutionResponse,
  StepExecution,
  WorkflowDefinition,
  AnomalyReport,
  AnalyticsSummaryResponse,
} from './types';
import * as api from './services/api';
import { evaluateWorkflowML, MLPrediction, mapReportToPrediction } from './services/mlPredictor';
import { CreateOrderModal } from './components/CreateOrderModal';
import { AuthModal, UserProfile } from './components/AuthModal';

interface ScheduleJob {
  id: string;
  name: string;
  intervalSec: number;
  customerName: string;
  amount: number;
  isActive: boolean;
  totalRuns: number;
  lastRunAt: string | null;
  nextRunCountdown: number;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'workflows' | 'executions' | 'tasks' | 'schedules' | 'ml' | 'settings'>('workflows');
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<ExecutionResponse[]>([]);
  const [selectedExecution, setSelectedExecution] = useState<ExecutionResponse | null>(null);
  const [events, setEvents] = useState<ExecutionEventResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [showLogsDrawer, setShowLogsDrawer] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  // Quick Order Bar on Workflows page
  const [showQuickOrderBar, setShowQuickOrderBar] = useState(false);
  const [quickOrderAmount, setQuickOrderAmount] = useState('149.99');
  const [quickOrderItem, setQuickOrderItem] = useState('MacBook M3');

  // Executions Tab Filters
  const [executionSearch, setExecutionSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [filterByUserOnly, setFilterByUserOnly] = useState<boolean>(false);

  // User Profile
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem('flowlab_user');
    return saved
      ? JSON.parse(saved)
      : { name: 'Aditya Kumar', email: 'aditya@flowlab.dev', role: 'Lead Backend Engineer', currency: '₹' };
  });

  // Settings State
  const [engineSettings, setEngineSettings] = useState(() => {
    const saved = localStorage.getItem('flowlab_engine_settings');
    return saved
      ? JSON.parse(saved)
      : {
          workerId: 'flowguard-worker-1',
          leaseDurationSec: 25,
          maxAttempts: 3,
          initialDelaySec: 2,
          multiplier: 2.0,
          allowFailureSimulation: true,
          currency: '₹',
          pollingIntervalSec: 2,
        };
  });

  // ML / Execution Analytics Data
  const [mlData, setMlData] = useState<MLPrediction | null>(null);
  const [mlReport, setMlReport] = useState<AnomalyReport | null>(null);
  const [analyticsSummary, setAnalyticsSummary] = useState<AnalyticsSummaryResponse | null>(null);
  const [recentAnomalies, setRecentAnomalies] = useState<AnomalyReport[]>([]);
  // ML Playground Simulator state
  const [mlSimAmount, setMlSimAmount] = useState<string>('249.00');
  const [mlSimError, setMlSimError] = useState<string>('504');
  const [mlSimAttempts, setMlSimAttempts] = useState<number>(2);
  const [mlPlaygroundResult, setMlPlaygroundResult] = useState<MLPrediction | null>(null);
  const [mlPlaygroundReport, setMlPlaygroundReport] = useState<AnomalyReport | null>(null);

  // Schedules state
  const [schedules, setSchedules] = useState<ScheduleJob[]>(() => {
    const saved = localStorage.getItem('flowlab_schedules');
    return saved
      ? JSON.parse(saved)
      : [
          {
            id: 'sch-1',
            name: 'Demo Order Generator',
            intervalSec: 30,
            customerName: 'Aditya Kumar',
            amount: 199.0,
            isActive: false,
            totalRuns: 0,
            lastRunAt: null,
            nextRunCountdown: 30,
          },
        ];
  });

  const [newScheduleName, setNewScheduleName] = useState('High-Priority Batch');
  const [newScheduleInterval, setNewScheduleInterval] = useState(60);
  const [newScheduleAmount, setNewScheduleAmount] = useState(250.0);

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Persist user and settings
  const handleUpdateUserProfile = (updated: UserProfile) => {
    setUserProfile(updated);
    localStorage.setItem('flowlab_user', JSON.stringify(updated));
    showToast(`Profile updated for ${updated.name}`);
  };

  const handleSaveSettings = () => {
    localStorage.setItem('flowlab_engine_settings', JSON.stringify(engineSettings));
    showToast('Engine settings saved successfully!');
  };

  // Load initial workflows and execution history
  const loadInitialData = useCallback(async () => {
    try {
      const [wfList, execPage] = await Promise.all([
        api.fetchWorkflows().catch(() => []),
        api.fetchExecutions(0, 50).catch(() => ({ content: [] })),
      ]);

      setWorkflows(wfList);
      setExecutions(execPage.content);

      if (execPage.content.length > 0 && !selectedExecution) {
        setSelectedExecution(execPage.content[0]);
      }
    } catch (err) {
      console.error('Failed to load initial data:', err);
    }
  }, [selectedExecution]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Load events & ML evaluations when selected execution changes
  const loadEvents = useCallback(async (execId: string) => {
    try {
      const eventsData = await api.fetchEvents(execId);
      setEvents(eventsData);
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  useEffect(() => {
    if (selectedExecution) {
      loadEvents(selectedExecution.id);

      // Run Backend Execution Analytics & Anomaly Detector
      let amount = 99.0;
      try {
        if (selectedExecution.inputJson) {
          const parsed = JSON.parse(selectedExecution.inputJson);
          if (parsed.amount) amount = Number(parsed.amount);
        }
      } catch {
        // default
      }

      const attemptsMap: Record<string, number> = {};
      selectedExecution.steps.forEach((s) => {
        attemptsMap[s.stepKey] = s.attemptCount;
      });

      api.fetchExecutionAnomaly(selectedExecution.id)
        .then((report) => {
          setMlReport(report);
          setMlData(mapReportToPrediction(report));
        })
        .catch((err) => {
          console.warn('Backend anomaly fetch error, falling back:', err);
          const prediction = evaluateWorkflowML(amount, attemptsMap, selectedExecution.errorMessage);
          setMlData(prediction);
        });
    }
  }, [selectedExecution?.id, selectedExecution?.status, selectedExecution?.steps, loadEvents, selectedExecution]);

  // Load analytics summary and recent anomalies when ML tab is active
  useEffect(() => {
    if (activeTab === 'ml') {
      api.fetchAnalyticsSummary()
        .then(setAnalyticsSummary)
        .catch((err) => console.warn('Failed to load analytics summary:', err));

      api.fetchRecentAnomalies(15)
        .then(setRecentAnomalies)
        .catch((err) => console.warn('Failed to load recent anomalies:', err));
    }
  }, [activeTab, selectedExecution?.id]);

  // Live polling while RUNNING or RETRY_WAIT
  useEffect(() => {
    if (!selectedExecution) return;

    const isTerminal =
      selectedExecution.status === 'COMPLETED' ||
      selectedExecution.status === 'FAILED' ||
      selectedExecution.status === 'CANCELLED';

    if (isTerminal) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }

    const interval = setInterval(async () => {
      try {
        const updated = await api.fetchExecution(selectedExecution.id);
        setSelectedExecution(updated);
        setExecutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
        loadEvents(updated.id);

        if (
          updated.status === 'COMPLETED' ||
          updated.status === 'FAILED' ||
          updated.status === 'CANCELLED'
        ) {
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Polling error:', err);
      }
    }, (engineSettings.pollingIntervalSec || 2) * 1000);

    pollingRef.current = interval;

    return () => {
      clearInterval(interval);
    };
  }, [selectedExecution?.id, selectedExecution?.status, engineSettings.pollingIntervalSec, loadEvents, selectedExecution]);

  // Schedules Runner: runs every 1 second to update countdowns and trigger active schedules
  useEffect(() => {
    const timer = setInterval(() => {
      setSchedules((prevList) => {
        return prevList.map((job) => {
          if (!job.isActive) return job;

          if (job.nextRunCountdown <= 1) {
            // Trigger workflow execution!
            triggerScheduleJob(job);
            return {
              ...job,
              totalRuns: job.totalRuns + 1,
              lastRunAt: new Date().toISOString(),
              nextRunCountdown: job.intervalSec,
            };
          }
          return {
            ...job,
            nextRunCountdown: job.nextRunCountdown - 1,
          };
        });
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [workflows]);

  useEffect(() => {
    localStorage.setItem('flowlab_schedules', JSON.stringify(schedules));
  }, [schedules]);

  const getWorkflowId = () => {
    if (workflows.length > 0) return workflows[0].id;
    return 'a0000000-0000-0000-0000-000000000001';
  };

  const triggerScheduleJob = async (job: ScheduleJob) => {
    try {
      const orderId = `ORD-SCHED-${Math.floor(1000 + Math.random() * 9000)}`;
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId,
          amount: job.amount,
          customerId: job.customerName,
          items: [`Automated Schedule Run (${job.name})`],
        },
        idempotencyKey: `idem-${orderId.toLowerCase()}`,
      });
      setExecutions((prev) => [res, ...prev]);
    } catch (e) {
      console.error('Schedule trigger failed:', e);
    }
  };

  const handleStartStandard = async () => {
    setIsLoading(true);
    try {
      const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId,
          amount: 149.99,
          customerId: userProfile.name,
          items: ['FlowLab Standard Package'],
        },
        idempotencyKey: 'key-' + orderId,
      });
      setSelectedExecution(res);
      setExecutions((prev) => [res, ...prev]);
      showToast(`Order ${orderId} launched successfully!`);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const orderId = 'ORD-' + Math.floor(1000 + Math.random() * 9000);
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId,
          amount: parseFloat(quickOrderAmount) || 99.0,
          customerId: userProfile.name,
          items: [quickOrderItem],
        },
        idempotencyKey: 'key-' + orderId,
      });
      setSelectedExecution(res);
      setExecutions((prev) => [res, ...prev]);
      setShowQuickOrderBar(false);
      showToast(`Created order ${orderId} for ${userProfile.name}!`);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCustomOrder = async (data: {
    orderId: string;
    amount: number;
    customerId: string;
    items: string[];
    idempotencyKey?: string;
    failAtStepKey?: string;
    failureMode?: 'CRASH' | 'TRANSIENT' | 'PERMANENT';
  }) => {
    setIsLoading(true);
    try {
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId: data.orderId,
          amount: data.amount,
          customerId: data.customerId,
          items: data.items,
        },
        idempotencyKey: data.idempotencyKey,
        failAtStepKey: data.failAtStepKey,
        failureMode: data.failureMode,
      });
      setSelectedExecution(res);
      setExecutions((prev) => [res, ...prev]);
      setShowCreateModal(false);
      showToast(`Custom order ${data.orderId} dispatched to engine!`);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartCrashDemo = async () => {
    setIsLoading(true);
    try {
      const orderId = 'ORD-CRASH-' + Math.floor(1000 + Math.random() * 9000);
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId,
          amount: 280.0,
          customerId: userProfile.name,
          items: ['Crash Test Item'],
        },
        idempotencyKey: 'key-' + orderId,
        failAtStepKey: 'UPDATE_INVENTORY',
        failureMode: 'CRASH',
      });
      setSelectedExecution(res);
      setExecutions((prev) => [res, ...prev]);
      showToast('Worker Crash Simulated! Recovery sweeper will resume without re-running payment.');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartTransientRetryDemo = async () => {
    setIsLoading(true);
    try {
      const orderId = 'ORD-RETRY-' + Math.floor(1000 + Math.random() * 9000);
      const res = await api.startExecution(getWorkflowId(), {
        inputData: {
          orderId,
          amount: 65.5,
          customerId: userProfile.name,
          items: ['Retry Backoff Test Item'],
        },
        idempotencyKey: 'key-' + orderId,
        failAtStepKey: 'PROCESS_PAYMENT',
        failureMode: 'TRANSIENT',
      });
      setSelectedExecution(res);
      setExecutions((prev) => [res, ...prev]);
      showToast('Transient Failure Simulated! Exponential backoff retry scheduled.');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRetry = async (id?: string) => {
    const targetId = id || selectedExecution?.id;
    if (!targetId) return;
    setIsLoading(true);
    try {
      const updated = await api.retryExecution(targetId);
      setSelectedExecution(updated);
      setExecutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast('Manual retry dispatched to worker pool!');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id?: string) => {
    const targetId = id || selectedExecution?.id;
    if (!targetId) return;
    setIsLoading(true);
    try {
      const updated = await api.cancelExecution(targetId);
      setSelectedExecution(updated);
      setExecutions((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
      showToast('Execution cancelled.');
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteExecution = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`Are you sure you want to remove execution ${id.substring(0, 8)}?`)) return;

    try {
      await api.deleteExecution(id);
      setExecutions((prev) => prev.filter((item) => item.id !== id));
      if (selectedExecution?.id === id) {
        const remaining = executions.filter((item) => item.id !== id);
        setSelectedExecution(remaining.length > 0 ? remaining[0] : null);
      }
      showToast('Order execution deleted successfully.');
    } catch (err: unknown) {
      alert((err as Error).message);
    }
  };

  const handleClearAllCompleted = () => {
    if (!window.confirm('Delete all completed and failed executions from local view?')) return;
    const activeOnly = executions.filter((e) => e.status === 'RUNNING' || e.status === 'PENDING');
    setExecutions(activeOnly);
    setSelectedExecution(activeOnly.length > 0 ? activeOnly[0] : null);
    showToast('Cleaned up execution list.');
  };

  const handleRunMlSimulator = async () => {
    const amt = parseFloat(mlSimAmount) || 100.0;
    try {
      const report = await api.simulateAnalytics({
        amount: amt,
        attemptCount: mlSimAttempts,
        errorType: mlSimError === 'none' ? undefined : mlSimError,
      });
      setMlPlaygroundReport(report);
      setMlPlaygroundResult(mapReportToPrediction(report));
    } catch (err) {
      console.warn('Backend ML simulation failed, using offline calculation:', err);
      const attemptsMap: Record<string, number> = {
        STEP_UNDER_TEST: mlSimAttempts,
      };
      const pred = evaluateWorkflowML(amt, attemptsMap, mlSimError === 'none' ? null : mlSimError);
      setMlPlaygroundResult(pred);
    }
  };

  // Helper icons for the 4 pipeline steps
  const getStepIcon = (key: string) => {
    switch (key) {
      case 'VALIDATE_ORDER':
        return <ShoppingCart size={18} />;
      case 'PROCESS_PAYMENT':
        return <CreditCard size={18} />;
      case 'UPDATE_INVENTORY':
        return <Package size={18} />;
      case 'SEND_NOTIFICATION':
        return <Mail size={18} />;
      default:
        return <CheckSquare size={18} />;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  };

  const formatDuration = (millis?: number | null) => {
    if (millis == null) return '—';
    return `${(millis / 1000).toFixed(1)}s`;
  };

  // Extract order customer from inputJson
  const getCustomerFromExecution = (exec: ExecutionResponse) => {
    try {
      if (exec.inputJson) {
        const parsed = JSON.parse(exec.inputJson);
        if (parsed.customerId) return parsed.customerId;
      }
    } catch {
      // fallback
    }
    return 'Customer';
  };

  // Extract order amount from inputJson
  const getAmountFromExecution = (exec: ExecutionResponse) => {
    try {
      if (exec.inputJson) {
        const parsed = JSON.parse(exec.inputJson);
        if (parsed.amount) return `$${parsed.amount}`;
      }
    } catch {
      // fallback
    }
    return '$149.99';
  };

  // Filtered executions
  const filteredExecutions = executions.filter((exec) => {
    const matchesSearch =
      exec.id.toLowerCase().includes(executionSearch.toLowerCase()) ||
      (exec.inputJson && exec.inputJson.toLowerCase().includes(executionSearch.toLowerCase())) ||
      (exec.idempotencyKey && exec.idempotencyKey.toLowerCase().includes(executionSearch.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || exec.status === statusFilter;

    let matchesUser = true;
    if (filterByUserOnly) {
      const cust = getCustomerFromExecution(exec).toLowerCase();
      matchesUser = cust.includes(userProfile.name.toLowerCase());
    }

    return matchesSearch && matchesStatus && matchesUser;
  });

  const myOrdersCount = executions.filter((e) =>
    getCustomerFromExecution(e).toLowerCase().includes(userProfile.name.toLowerCase())
  ).length;

  return (
    <div className="mac-window">
      {/* 1. macOS Window Titlebar */}
      <div className="mac-titlebar">
        <div className="traffic-lights">
          <span className="traffic-light traffic-red" />
          <span className="traffic-light traffic-yellow" />
          <span className="traffic-light traffic-green" />
        </div>
        <div className="titlebar-center">
          <Brain size={14} color="#a855f7" />
          <span>FlowLab • Crash-Proof Orchestration Engine (Spring Boot + PostgreSQL)</span>
        </div>
        {toastMessage && (
          <div
            style={{
              position: 'absolute',
              right: '24px',
              background: 'rgba(16, 185, 129, 0.95)',
              color: 'white',
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '20px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Check size={12} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* 2. Window Content Body */}
      <div className="window-body">
        {/* Left Sidebar */}
        <aside className="sidebar">
          <div className="sidebar-brand">
            <div className="sidebar-brand-icon">
              <Layers size={18} />
            </div>
            <span className="sidebar-brand-name">FlowLab</span>
          </div>

          <nav className="sidebar-nav" style={{ flex: 1 }}>
            <div
              className={`nav-item ${activeTab === 'workflows' ? 'active' : ''}`}
              onClick={() => setActiveTab('workflows')}
            >
              <Layers size={16} />
              <span>Workflows</span>
            </div>

            <div
              className={`nav-item ${activeTab === 'executions' ? 'active' : ''}`}
              onClick={() => setActiveTab('executions')}
            >
              <ListOrdered size={16} />
              <span>Executions</span>
              {executions.length > 0 && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: '#1e293b',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '11px',
                  }}
                >
                  {executions.length}
                </span>
              )}
            </div>

            <div
              className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <CheckSquare size={16} />
              <span>Tasks &amp; Leases</span>
            </div>

            <div
              className={`nav-item ${activeTab === 'schedules' ? 'active' : ''}`}
              onClick={() => setActiveTab('schedules')}
            >
              <Calendar size={16} />
              <span>Schedules</span>
              {schedules.some((s) => s.isActive) && (
                <span
                  style={{
                    marginLeft: 'auto',
                    background: 'rgba(16, 185, 129, 0.2)',
                    color: '#34d399',
                    borderRadius: '10px',
                    padding: '1px 6px',
                    fontSize: '10px',
                    fontWeight: 700,
                  }}
                >
                  RUNNING
                </span>
              )}
            </div>

            <div
              className={`nav-item ${activeTab === 'ml' ? 'active' : ''}`}
              onClick={() => setActiveTab('ml')}
            >
              <Brain size={16} color="#c084fc" />
              <span>ML Insights</span>
            </div>

            <div
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <Settings size={16} />
              <span>Settings</span>
            </div>
          </nav>

          {/* User Account / Login Profile Footer in Sidebar */}
          <div
            onClick={() => setShowAuthModal(true)}
            style={{
              marginTop: 'auto',
              background: '#101626',
              border: '1px solid #1e2b45',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            title="Click to Switch User Account or Log In"
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #38bdf8, #6366f1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                color: 'white',
              }}
            >
              {userProfile.name.charAt(0)}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#f8fafc', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
                {userProfile.name}
              </div>
              <div style={{ fontSize: '10px', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                {userProfile.role}
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="main-view">
          {/* TAB 1: WORKFLOWS */}
          {activeTab === 'workflows' && (
            <>
              {/* Breadcrumb Navigation */}
              <div className="breadcrumb">
                <span>Workflows</span>
                <span>&gt;</span>
                <span className="breadcrumb-active">Order Processing</span>
              </div>

              {/* Workflow Header Banner */}
              <div className="view-header">
                <div>
                  <div className="view-title-group">
                    <h1 className="view-title">Order Processing</h1>
                    <span className="status-badge-active">Active</span>
                    {selectedExecution && (
                      <span
                        style={{
                          fontFamily: 'JetBrains Mono, monospace',
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginLeft: '6px',
                        }}
                      >
                        ID: {selectedExecution.id.substring(0, 8)}...
                      </span>
                    )}
                  </div>
                  <p className="view-description">
                    Process customer orders with payment, inventory and notification steps.
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="header-action-group">
                  {/* Primary Prominent ADD NEW ORDER Button */}
                  <button
                    className="btn-start"
                    onClick={() => setShowCreateModal(true)}
                    style={{
                      background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                      boxShadow: '0 0 15px rgba(2, 132, 199, 0.4)',
                    }}
                    title="Open Order Creator Modal to submit items, amount, and customer data"
                  >
                    <Plus size={15} />
                    <span>+ Add New Order</span>
                  </button>

                  <button
                    className="btn-demo"
                    onClick={() => setShowQuickOrderBar(!showQuickOrderBar)}
                    style={{ borderColor: '#38bdf8', color: '#38bdf8' }}
                  >
                    <Zap size={14} />
                    <span>Quick Bar</span>
                  </button>

                  <button
                    className="btn-demo"
                    onClick={handleStartCrashDemo}
                    disabled={isLoading}
                    title="Simulates worker crash during Inventory. Verifies auto-recovery on lease expiry without re-running payment!"
                  >
                    <Flame size={14} color="#f87171" />
                    <span>Simulate Crash</span>
                  </button>

                  <button
                    className="btn-demo"
                    onClick={handleStartTransientRetryDemo}
                    disabled={isLoading}
                    title="Simulates transient 504 payment failure to verify exponential backoff"
                  >
                    <RefreshCcw size={14} color="#fbbf24" />
                    <span>Simulate Retry</span>
                  </button>

                  {selectedExecution && (
                    <button
                      className="btn-demo"
                      onClick={(e) => handleDeleteExecution(selectedExecution.id, e)}
                      title="Delete this order execution"
                      style={{ color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                    >
                      <Trash2 size={14} />
                      <span>Remove Order</span>
                    </button>
                  )}

                  <button
                    className="btn-start"
                    onClick={handleStartStandard}
                    disabled={isLoading}
                  >
                    <Play size={14} fill="white" />
                    <span>Start Workflow</span>
                  </button>
                </div>
              </div>

              {/* Quick Order Inline Bar (Collapsible) */}
              {showQuickOrderBar && (
                <form
                  onSubmit={handleQuickOrderSubmit}
                  style={{
                    background: '#101726',
                    border: '1px solid #1e2b45',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    flexWrap: 'wrap',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShoppingBag size={16} color="#38bdf8" />
                    <span style={{ fontSize: '13px', fontWeight: 700, color: '#f8fafc' }}>
                      Quick Order for {userProfile.name}:
                    </span>
                  </div>

                  <select
                    value={quickOrderItem}
                    onChange={(e) => {
                      setQuickOrderItem(e.target.value);
                      if (e.target.value.includes('MacBook')) setQuickOrderAmount('1299.00');
                      else if (e.target.value.includes('Sony')) setQuickOrderAmount('349.50');
                      else if (e.target.value.includes('iPhone')) setQuickOrderAmount('1199.00');
                      else setQuickOrderAmount('149.99');
                    }}
                    style={{
                      background: '#090e18',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      color: '#f8fafc',
                      fontSize: '12px',
                    }}
                  >
                    <option value="MacBook Pro M3">MacBook Pro M3 ($1299)</option>
                    <option value="Sony WH-1000XM5">Sony Headphones ($349)</option>
                    <option value="iPhone 16 Pro Max">iPhone 16 Pro ($1199)</option>
                    <option value="Mechanical Keyboard">Mechanical Keyboard ($149)</option>
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>Amount:</span>
                    <input
                      type="number"
                      value={quickOrderAmount}
                      onChange={(e) => setQuickOrderAmount(e.target.value)}
                      style={{
                        width: '90px',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '6px 10px',
                        color: '#10b981',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-start"
                    disabled={isLoading}
                    style={{ padding: '6px 14px', fontSize: '12px' }}
                  >
                    <span>Run Order Workflow</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowQuickOrderBar(false)}
                    style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer' }}
                  >
                    <X size={16} />
                  </button>
                </form>
              )}

              {/* Horizontal Connected Pipeline Stepper */}
              {selectedExecution && (
                <div className="pipeline-wrapper">
                  {selectedExecution.steps.map((step: StepExecution, index: number) => {
                    const statusClass = step.status.toLowerCase();
                    const isLast = index === selectedExecution.steps.length - 1;

                    return (
                      <React.Fragment key={step.id}>
                        <div className={`pipeline-card ${statusClass}`}>
                          <div className="card-icon-box">{getStepIcon(step.stepKey)}</div>
                          <div>
                            <div className="card-title">{step.stepName}</div>
                            <div className="card-status">{step.status.replace('_', ' ')}</div>
                          </div>

                          {step.errorMessage && (
                            <div
                              style={{
                                fontSize: '11px',
                                color: '#f87171',
                                fontFamily: 'JetBrains Mono, monospace',
                              }}
                            >
                              {step.errorMessage}
                            </div>
                          )}

                          {step.durationMillis != null && (
                            <div className="card-meta-detail">
                              {(step.durationMillis / 1000).toFixed(1)}s • Attempt {step.attemptCount}
                            </div>
                          )}
                        </div>

                        {!isLast && (
                          <div className="pipeline-arrow">
                            <ArrowRight size={18} />
                          </div>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}

              {/* Execution History Section */}
              <div className="history-section">
                <div className="history-header">
                  <div>
                    <h2 className="history-title">Execution History</h2>
                    {selectedExecution && (
                      <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                        Customer: <b>{getCustomerFromExecution(selectedExecution)}</b> • Value: {getAmountFromExecution(selectedExecution)}
                      </span>
                    )}
                  </div>
                  <button className="btn-view-logs" onClick={() => setShowLogsDrawer(true)}>
                    <FileText size={14} />
                    <span>View Logs</span>
                  </button>
                </div>

                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Step</th>
                      <th>Status</th>
                      <th>Started At</th>
                      <th>Duration</th>
                      <th>Attempts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedExecution && selectedExecution.steps.length > 0 ? (
                      selectedExecution.steps.map((step: StepExecution) => {
                        const statusKey = step.status.toLowerCase();
                        const statusLabel =
                          step.status === 'COMPLETED'
                            ? 'Success'
                            : step.status === 'RUNNING'
                            ? 'Running'
                            : step.status === 'RETRY_WAIT'
                            ? 'Retrying'
                            : step.status === 'FAILED'
                            ? 'Failed'
                            : 'Pending';

                        return (
                          <tr key={step.id}>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>{step.stepName}</td>
                            <td>
                              <span className="status-dot-cell">
                                <span className={`status-dot-indicator dot-${statusKey}`} />
                                <span
                                  style={{
                                    color:
                                      step.status === 'COMPLETED'
                                        ? '#10b981'
                                        : step.status === 'RUNNING'
                                        ? '#3b82f6'
                                        : step.status === 'RETRY_WAIT'
                                        ? '#f59e0b'
                                        : step.status === 'FAILED'
                                        ? '#ef4444'
                                        : '#94a3b8',
                                  }}
                                >
                                  {statusLabel}
                                </span>
                              </span>
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {formatTime(step.startedAt)}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {formatDuration(step.durationMillis)}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {step.attemptCount}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                          No step executions recorded. Click &quot;Start Workflow&quot; or &quot;+ Add New Order&quot; to begin.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* ML Predictive Diagnostics Bar */}
              {mlData && (
                <div className="ml-intelligence-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        background: 'rgba(168, 85, 247, 0.2)',
                        padding: '10px',
                        borderRadius: '10px',
                        color: '#c084fc',
                      }}
                    >
                      <Brain size={24} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc' }}>
                          Backend Execution Analytics &amp; Anomaly Detector
                        </span>
                        <span className="ml-pill">
                          {mlReport?.status === 'INSUFFICIENT_DATA' ? 'Baseline Warming' : 'Statistical Model Active'}
                        </span>
                      </div>
                      <p style={{ fontSize: '12px', color: '#94a3b8' }}>{mlData.explanation}</p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '20px', alignItems: 'center' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                        Anomaly Score
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: mlData.isAnomaly ? '#f87171' : '#34d399',
                        }}
                      >
                        {mlData.anomalyScore} ({mlData.riskLevel} RISK)
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '11px', color: '#64748b', textTransform: 'uppercase' }}>
                        Retry Status
                      </div>
                      <div
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          fontFamily: 'JetBrains Mono, monospace',
                          color: mlReport?.riskAssessment?.retryEligibility === 'PERMANENT_NON_RETRYABLE' ? '#f87171' : '#38bdf8',
                        }}
                      >
                        {mlReport?.riskAssessment?.retryEligibility?.replace(/_/g, ' ') || 'ELIGIBLE'}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* TAB 2: EXECUTIONS MANAGEMENT */}
          {activeTab === 'executions' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 className="view-title">Workflow Executions</h1>
                  <p className="view-description">Inspect, re-run, cancel or remove past and active workflow runs.</p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn-start"
                    onClick={() => setShowCreateModal(true)}
                    style={{ background: 'linear-gradient(135deg, #0284c7, #2563eb)' }}
                  >
                    <Plus size={14} />
                    <span>+ Add New Order</span>
                  </button>
                  <button className="btn-demo" onClick={handleClearAllCompleted}>
                    <Trash2 size={14} />
                    <span>Clean History</span>
                  </button>
                </div>
              </div>

              {/* Filters Bar */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                  <Search size={14} style={{ position: 'absolute', left: '12px', top: '12px', color: '#64748b' }} />
                  <input
                    type="text"
                    placeholder="Search by Execution ID, Customer Name, Items..."
                    value={executionSearch}
                    onChange={(e) => setExecutionSearch(e.target.value)}
                    style={{
                      width: '100%',
                      background: '#131a2b',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '8px 12px 8px 34px',
                      color: '#f8fafc',
                      fontSize: '13px',
                    }}
                  />
                </div>

                {/* Filter by User Account Toggle */}
                <button
                  type="button"
                  onClick={() => setFilterByUserOnly(!filterByUserOnly)}
                  style={{
                    background: filterByUserOnly ? 'rgba(56, 189, 248, 0.2)' : '#131a2b',
                    border: '1px solid ' + (filterByUserOnly ? '#38bdf8' : '#1e293b'),
                    color: filterByUserOnly ? '#38bdf8' : '#94a3b8',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <User size={13} />
                  <span>My Orders Only ({myOrdersCount})</span>
                </button>

                <div style={{ display: 'flex', gap: '6px' }}>
                  {['ALL', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        background: statusFilter === st ? '#2563eb' : '#131a2b',
                        border: '1px solid ' + (statusFilter === st ? '#3b82f6' : '#1e293b'),
                        color: statusFilter === st ? 'white' : '#94a3b8',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Executions Table */}
              <div className="history-section">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Execution / Order ID</th>
                      <th>Customer</th>
                      <th>Status</th>
                      <th>Progress</th>
                      <th>Started</th>
                      <th>Duration</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExecutions.length > 0 ? (
                      filteredExecutions.map((exec) => {
                        const completedSteps = exec.steps.filter((s) => s.status === 'COMPLETED').length;
                        const totalSteps = exec.steps.length || 4;
                        const customer = getCustomerFromExecution(exec);
                        const amount = getAmountFromExecution(exec);

                        return (
                          <tr
                            key={exec.id}
                            style={{
                              background: selectedExecution?.id === exec.id ? 'rgba(59, 130, 246, 0.05)' : undefined,
                            }}
                          >
                            <td>
                              <div
                                style={{
                                  fontFamily: 'JetBrains Mono, monospace',
                                  color: '#38bdf8',
                                  fontWeight: 600,
                                  cursor: 'pointer',
                                }}
                                onClick={() => {
                                  setSelectedExecution(exec);
                                  setActiveTab('workflows');
                                }}
                              >
                                {exec.id.substring(0, 8)}...
                              </div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                Value: {amount}
                              </div>
                            </td>
                            <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                              {customer}
                            </td>
                            <td>
                              <span className="status-dot-cell">
                                <span className={`status-dot-indicator dot-${exec.status.toLowerCase()}`} />
                                <span>{exec.status}</span>
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'JetBrains Mono, monospace' }}>
                                  {completedSteps}/{totalSteps}
                                </span>
                                <div style={{ display: 'flex', gap: '3px' }}>
                                  {exec.steps.map((st) => (
                                    <span
                                      key={st.id}
                                      style={{
                                        width: '6px',
                                        height: '6px',
                                        borderRadius: '50%',
                                        background:
                                          st.status === 'COMPLETED'
                                            ? '#10b981'
                                            : st.status === 'RUNNING'
                                            ? '#3b82f6'
                                            : st.status === 'FAILED'
                                            ? '#ef4444'
                                            : '#334155',
                                      }}
                                    />
                                  ))}
                                </div>
                              </div>
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {formatTime(exec.createdAt)}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {formatDuration(exec.durationMillis)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'inline-flex', gap: '6px' }}>
                                <button
                                  onClick={() => {
                                    setSelectedExecution(exec);
                                    setActiveTab('workflows');
                                  }}
                                  style={{
                                    background: '#1e293b',
                                    border: 'none',
                                    color: '#38bdf8',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  View
                                </button>
                                {exec.status === 'FAILED' && (
                                  <button
                                    onClick={() => handleManualRetry(exec.id)}
                                    style={{
                                      background: 'rgba(245, 158, 11, 0.2)',
                                      border: 'none',
                                      color: '#fbbf24',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Retry
                                  </button>
                                )}
                                {exec.status === 'RUNNING' && (
                                  <button
                                    onClick={() => handleCancel(exec.id)}
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.2)',
                                      border: 'none',
                                      color: '#f87171',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    Cancel
                                  </button>
                                )}
                                <button
                                  onClick={(e) => handleDeleteExecution(exec.id, e)}
                                  title="Remove / Delete this order"
                                  style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#64748b',
                                    padding: '4px 6px',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <Trash2 size={14} color="#f87171" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                          No executions match the filter criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: TASKS & LEASES */}
          {activeTab === 'tasks' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 className="view-title">Worker Tasks &amp; Active Leases</h1>
                <p className="view-description">
                  Real-time worker concurrency monitor, active thread pool capacity, and step lock expiration.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Registered Worker Node</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#38bdf8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {engineSettings.workerId}
                    </span>
                  </div>
                  <Cpu size={24} color="#38bdf8" />
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Worker Pool Capacity</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#10b981', fontFamily: 'JetBrains Mono, monospace' }}>
                      4 Core / 16 Max
                    </span>
                  </div>
                  <Activity size={24} color="#10b981" />
                </div>

                <div className="stat-card">
                  <div className="stat-info">
                    <span className="stat-label">Lease Duration Window</span>
                    <span style={{ fontSize: '20px', fontWeight: 700, color: '#f59e0b', fontFamily: 'JetBrains Mono, monospace' }}>
                      {engineSettings.leaseDurationSec} Seconds
                    </span>
                  </div>
                  <Clock size={24} color="#f59e0b" />
                </div>
              </div>

              <div className="history-section">
                <div className="history-header">
                  <h2 className="history-title">Active Database Step Leases</h2>
                  <button
                    className="btn-demo"
                    onClick={() => showToast('Crash recovery lease sweeper ran. Orphaned leases reclaimed.')}
                  >
                    <RefreshCcw size={14} />
                    <span>Run Sweeper Now</span>
                  </button>
                </div>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Step Key</th>
                      <th>Step Name</th>
                      <th>Lease Owner</th>
                      <th>Lease Expiration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedExecution?.steps && selectedExecution.steps.filter((s) => s.workerLeaseOwner).length > 0 ? (
                      selectedExecution.steps
                        .filter((s) => s.workerLeaseOwner)
                        .map((step) => (
                          <tr key={step.id}>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', color: '#38bdf8' }}>{step.stepKey}</td>
                            <td style={{ fontWeight: 600 }}>{step.stepName}</td>
                            <td>{step.workerLeaseOwner}</td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                              {step.workerLeaseUntil ? new Date(step.workerLeaseUntil).toLocaleTimeString() : '—'}
                            </td>
                            <td>
                              <span className="status-dot-cell">
                                <span className={`status-dot-indicator dot-${step.status.toLowerCase()}`} />
                                <span>{step.status}</span>
                              </span>
                            </td>
                          </tr>
                        ))
                    ) : (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                          No active worker leases held currently. All completed steps committed durably.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: SCHEDULES */}
          {activeTab === 'schedules' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <h1 className="view-title">Scheduled Engines &amp; Periodic Daemons</h1>
                  <p className="view-description">
                    Automated background daemons for crash recovery inspection, retry dispatching, and scheduled recurring orders.
                  </p>
                </div>
              </div>

              {/* Background Daemons Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RotateCcw size={18} color="#a855f7" />
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Crash Recovery Sweeper</h3>
                    </div>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>
                      Active
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px' }}>
                    Runs every 10 seconds. Scans for orphaned steps where <code>worker_lease_until &lt; NOW()</code>, reclaims ownership, and safely resumes work without repeating completed steps.
                  </p>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748b' }}>
                    Cron: @Scheduled(fixedDelay = 10000ms)
                  </div>
                </div>

                <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <RefreshCcw size={18} color="#f59e0b" />
                      <h3 style={{ fontSize: '15px', fontWeight: 700 }}>Retry Backoff Dispatcher</h3>
                    </div>
                    <span style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontSize: '11px', padding: '2px 8px', borderRadius: '10px' }}>
                      Active
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#94a3b8', lineHeight: 1.5, marginBottom: '14px' }}>
                    Polls every 2 seconds. Identifies steps in <code>RETRY_WAIT</code> whose exponential backoff countdown timer has expired and dispatches them to worker threads.
                  </p>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '11px', color: '#64748b' }}>
                    Cron: @Scheduled(fixedDelay = 2000ms)
                  </div>
                </div>
              </div>

              {/* User Schedule Creator */}
              <div style={{ background: '#101726', border: '1px solid #1e2b45', borderRadius: '12px', padding: '20px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '14px', color: '#f8fafc' }}>
                  + Configure Recurring Workflow Schedule
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'flex-end' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Schedule Name
                    </label>
                    <input
                      type="text"
                      value={newScheduleName}
                      onChange={(e) => setNewScheduleName(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Execution Interval
                    </label>
                    <select
                      value={newScheduleInterval}
                      onChange={(e) => setNewScheduleInterval(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    >
                      <option value={15}>Every 15 Seconds (Rapid Test)</option>
                      <option value={30}>Every 30 Seconds</option>
                      <option value={60}>Every 1 Minute</option>
                      <option value={300}>Every 5 Minutes</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Order Amount ($)
                    </label>
                    <input
                      type="number"
                      value={newScheduleAmount}
                      onChange={(e) => setNewScheduleAmount(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#10b981',
                        fontFamily: 'JetBrains Mono, monospace',
                        fontWeight: 700,
                        fontSize: '12px',
                      }}
                    />
                  </div>

                  <button
                    className="btn-start"
                    onClick={() => {
                      const newJob: ScheduleJob = {
                        id: 'sch-' + Date.now(),
                        name: newScheduleName,
                        intervalSec: newScheduleInterval,
                        customerName: userProfile.name,
                        amount: newScheduleAmount,
                        isActive: true,
                        totalRuns: 0,
                        lastRunAt: null,
                        nextRunCountdown: newScheduleInterval,
                      };
                      setSchedules([...schedules, newJob]);
                      showToast(`Schedule '${newScheduleName}' activated!`);
                    }}
                    style={{ padding: '9px 16px', fontSize: '12px' }}
                  >
                    <Plus size={14} />
                    <span>Create Schedule</span>
                  </button>
                </div>
              </div>

              {/* Active User Schedules Table */}
              <div className="history-section">
                <div className="history-header">
                  <h2 className="history-title">Active Automation Schedules</h2>
                </div>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Schedule Name</th>
                      <th>Interval</th>
                      <th>Next Trigger</th>
                      <th>Total Runs</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedules.map((sch) => (
                      <tr key={sch.id}>
                        <td style={{ fontWeight: 600, color: '#f8fafc' }}>
                          <div>{sch.name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                            Customer: {sch.customerName} • ${sch.amount}
                          </div>
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          Every {sch.intervalSec}s
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace', color: sch.isActive ? '#38bdf8' : '#64748b' }}>
                          {sch.isActive ? `${sch.nextRunCountdown}s` : 'Paused'}
                        </td>
                        <td style={{ fontFamily: 'JetBrains Mono, monospace' }}>
                          {sch.totalRuns}
                        </td>
                        <td>
                          <span
                            style={{
                              background: sch.isActive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(100, 116, 139, 0.15)',
                              color: sch.isActive ? '#34d399' : '#94a3b8',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {sch.isActive ? 'RUNNING' : 'PAUSED'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <button
                              onClick={() => triggerScheduleJob(sch)}
                              style={{
                                background: '#1e293b',
                                border: 'none',
                                color: '#38bdf8',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              Run Now
                            </button>
                            <button
                              onClick={() => {
                                setSchedules(
                                  schedules.map((s) => (s.id === sch.id ? { ...s, isActive: !s.isActive } : s))
                                );
                              }}
                              style={{
                                background: '#1e293b',
                                border: 'none',
                                color: '#fbbf24',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '11px',
                                cursor: 'pointer',
                              }}
                            >
                              {sch.isActive ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              onClick={() => setSchedules(schedules.filter((s) => s.id !== sch.id))}
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#f87171',
                                padding: '4px 6px',
                                cursor: 'pointer',
                              }}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: ML / EXECUTION ANALYTICS */}
          {activeTab === 'ml' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h1 className="view-title">Backend Execution Analytics &amp; Anomaly Detection</h1>
                <p className="view-description">
                  Statistical distribution analysis evaluating workflow duration deviations, retry loops, infrastructure timeouts, and crash recoveries using persisted database state.
                </p>
              </div>

              {/* Baseline Status & Diagnostics Bar */}
              {analyticsSummary && (
                <div style={{ background: '#0e1626', border: '1px solid #1e293b', borderRadius: '10px', padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Activity size={16} color="#38bdf8" />
                    <span style={{ fontSize: '13px', color: '#f8fafc' }}>
                      Engine Baseline: <b style={{ color: analyticsSummary.baseline.sampleSize < 5 ? '#fbbf24' : '#34d399' }}>{analyticsSummary.baseline.sampleSize} Runs</b>
                    </span>
                    <span style={{ fontSize: '12px', color: '#64748b' }}>•</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {analyticsSummary.baseline.statusNote}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span className="badge" style={{ background: analyticsSummary.engineHealth === 'HEALTHY' ? 'rgba(52, 211, 153, 0.2)' : 'rgba(251, 191, 36, 0.2)', color: analyticsSummary.engineHealth === 'HEALTHY' ? '#34d399' : '#fbbf24' }}>
                      {analyticsSummary.engineHealth}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      Anomaly Rate: <b>{analyticsSummary.anomalyRatePercent}%</b>
                    </span>
                  </div>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
                <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Anomaly Risk Score
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: mlData?.isAnomaly ? '#f87171' : '#34d399' }}>
                    {mlData?.anomalyScore ?? 0.04}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    Status: <b>{mlReport?.status ?? (mlData?.riskLevel ? `${mlData.riskLevel} RISK` : 'EVALUATED')}</b>
                  </div>
                </div>

                <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Retry Eligibility &amp; Policy
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: mlReport?.riskAssessment?.retryEligibility === 'PERMANENT_NON_RETRYABLE' ? '#f87171' : '#38bdf8' }}>
                    {mlReport?.riskAssessment?.retryEligibility?.replace(/_/g, ' ') || 'ELIGIBLE'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    {mlReport?.riskAssessment?.empiricalRecoveryRate != null
                      ? `Empirical recovery rate: ${mlReport.riskAssessment.empiricalRecoveryRate}%`
                      : (mlReport?.riskAssessment?.basis || 'Deterministic engine policy evaluation')}
                  </div>
                </div>

                <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '20px' }}>
                  <div style={{ fontSize: '12px', color: '#94a3b8', textTransform: 'uppercase', marginBottom: '6px' }}>
                    Smart Backoff Recommendation
                  </div>
                  <div style={{ fontSize: '28px', fontWeight: 800, fontFamily: 'JetBrains Mono, monospace', color: '#fbbf24' }}>
                    {(mlData?.smartBackoffRecommendationMs ?? 2000) / 1000}s
                  </div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '6px' }}>
                    Adaptive non-blocking delay recommendation
                  </div>
                </div>
              </div>

              {/* Interactive ML Simulator Playground */}
              <div style={{ background: '#101726', border: '1px solid #1e2b45', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <Brain size={18} color="#c084fc" />
                  <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#f8fafc' }}>
                    Interactive Execution Risk &amp; Anomaly Simulator
                  </h3>
                </div>
                <p style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '16px' }}>
                  Evaluate hypothetical order amounts and failure responses against the live backend statistical baseline to inspect anomaly scores, reason codes, and retry survivability.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Simulated Order Amount ($)
                    </label>
                    <input
                      type="number"
                      value={mlSimAmount}
                      onChange={(e) => setMlSimAmount(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Simulated Error Condition
                    </label>
                    <select
                      value={mlSimError}
                      onChange={(e) => setMlSimError(e.target.value)}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    >
                      <option value="none">None (Clean Execution)</option>
                      <option value="504 Gateway Timeout">HTTP 504 Gateway Timeout</option>
                      <option value="declined Insufficient Funds">HTTP 402 Card Declined</option>
                      <option value="worker_crash">Worker Node Segfault Crash</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Prior Retry Attempt Count
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={mlSimAttempts}
                      onChange={(e) => setMlSimAttempts(Number(e.target.value))}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button
                      className="btn-start"
                      onClick={handleRunMlSimulator}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      <Brain size={14} />
                      <span>Run Backend Analysis</span>
                    </button>
                  </div>
                </div>

                {mlPlaygroundResult && (
                  <div
                    style={{
                      background: '#090e18',
                      border: '1px solid #1e2b45',
                      borderRadius: '8px',
                      padding: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: '#38bdf8' }}>
                        Backend Evaluation Result
                      </span>
                      <span
                        style={{
                          background: mlPlaygroundResult.isAnomaly ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: mlPlaygroundResult.isAnomaly ? '#f87171' : '#34d399',
                          padding: '3px 10px',
                          borderRadius: '10px',
                          fontSize: '11px',
                          fontWeight: 700,
                        }}
                      >
                        {mlPlaygroundResult.riskLevel} RISK (Score: {mlPlaygroundResult.anomalyScore})
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: '#f8fafc' }}>
                      {mlPlaygroundResult.explanation}
                    </div>
                    {mlPlaygroundReport?.reasonCodes && (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {mlPlaygroundReport.reasonCodes.map((rc, idx) => (
                          <span
                            key={idx}
                            style={{
                              background: '#1a2234',
                              color: rc.includes('NORMAL') ? '#34d399' : '#fbbf24',
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontFamily: 'JetBrains Mono, monospace',
                            }}
                          >
                            {rc}
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span>Eligibility: <b style={{ color: '#38bdf8' }}>{mlPlaygroundReport?.riskAssessment?.retryEligibility?.replace(/_/g, ' ') || 'ELIGIBLE'}</b></span>
                      <span>Attempts Left: <b style={{ color: '#38bdf8' }}>{mlPlaygroundReport?.riskAssessment?.attemptsRemaining ?? 2}/{mlPlaygroundReport?.riskAssessment?.configuredMaxAttempts ?? 3}</b></span>
                      <span>Recommended Backoff: <b style={{ color: '#fbbf24' }}>{mlPlaygroundResult.smartBackoffRecommendationMs / 1000}s</b></span>
                    </div>
                    {mlPlaygroundReport?.riskAssessment?.basis && (
                      <div style={{ fontSize: '11px', color: '#94a3b8', background: '#0d1524', padding: '6px 10px', borderRadius: '4px' }}>
                        <b>Policy Basis:</b> {mlPlaygroundReport.riskAssessment.basis}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Contributing Features Table for Selected Execution */}
              {mlReport && mlReport.contributingFeatures && mlReport.contributingFeatures.length > 0 && (
                <div style={{ background: '#101726', border: '1px solid #1e2b45', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                    Contributing Statistical Features (Selected Execution)
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="execution-table">
                      <thead>
                        <tr>
                          <th>Feature</th>
                          <th>Observed</th>
                          <th>Baseline Mean</th>
                          <th>Deviation Score</th>
                          <th>Outlier Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mlReport.contributingFeatures.map((feat, idx) => (
                          <tr key={idx}>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#38bdf8' }}>
                              {feat.featureName}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {typeof feat.observedValue === 'number' ? feat.observedValue.toFixed(1) : feat.observedValue}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#94a3b8' }}>
                              {typeof feat.baselineMean === 'number' ? feat.baselineMean.toFixed(1) : feat.baselineMean}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}>
                              {feat.deviationScore}
                            </td>
                            <td>
                              <span
                                style={{
                                  background: feat.outlier ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: feat.outlier ? '#f87171' : '#34d399',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                }}
                              >
                                {feat.outlier ? 'OUTLIER' : 'NORMAL'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Recent Anomalies Table */}
              {recentAnomalies.length > 0 && (
                <div style={{ background: '#101726', border: '1px solid #1e2b45', borderRadius: '12px', padding: '20px' }}>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#f8fafc', marginBottom: '12px' }}>
                    Recent Execution Anomaly Assessments
                  </h3>
                  <div style={{ overflowX: 'auto' }}>
                    <table className="execution-table">
                      <thead>
                        <tr>
                          <th>Execution ID</th>
                          <th>Score</th>
                          <th>Severity</th>
                          <th>Status</th>
                          <th>Reason Codes</th>
                          <th>Survivability</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentAnomalies.map((rep) => (
                          <tr key={rep.executionId}>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#38bdf8' }}>
                              {rep.executionId.substring(0, 8)}...
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', fontWeight: 700, color: rep.isAnomaly ? '#f87171' : '#34d399' }}>
                              {rep.anomalyScore}
                            </td>
                            <td>
                              <span
                                style={{
                                  background: rep.severity === 'CRITICAL' || rep.severity === 'HIGH' ? 'rgba(239, 68, 68, 0.2)' : rep.severity === 'MEDIUM' ? 'rgba(251, 191, 36, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                  color: rep.severity === 'CRITICAL' || rep.severity === 'HIGH' ? '#f87171' : rep.severity === 'MEDIUM' ? '#fbbf24' : '#34d399',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                }}
                              >
                                {rep.severity}
                              </span>
                            </td>
                            <td style={{ fontSize: '11px', color: '#94a3b8' }}>
                              {rep.status}
                            </td>
                            <td style={{ fontSize: '11px', color: '#cbd5e1' }}>
                              {rep.reasonCodes.join(', ')}
                            </td>
                            <td style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '12px', color: '#38bdf8' }}>
                              {rep.riskAssessment?.retrySurvivabilityRate ?? '-'}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: SETTINGS */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '780px' }}>
              <div>
                <h1 className="view-title">Engine Configuration &amp; Settings</h1>
                <p className="view-description">
                  Adjust worker lease timeout, exponential retry policies, active user preferences, and data maintenance.
                </p>
              </div>

              {/* User Account Settings Section */}
              <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <User size={18} color="#38bdf8" />
                    <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                      Active User Account &amp; Identity
                    </h3>
                  </div>
                  <button
                    className="btn-demo"
                    onClick={() => setShowAuthModal(true)}
                  >
                    Switch User / Login
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Logged-in Name
                    </label>
                    <input
                      type="text"
                      value={userProfile.name}
                      onChange={(e) => handleUpdateUserProfile({ ...userProfile, name: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={userProfile.email}
                      onChange={(e) => handleUpdateUserProfile({ ...userProfile, email: e.target.value })}
                      style={{
                        width: '100%',
                        background: '#090e18',
                        border: '1px solid #1e293b',
                        borderRadius: '6px',
                        padding: '8px 12px',
                        color: '#f8fafc',
                        fontSize: '13px',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Engine Parameters Section */}
              <div style={{ background: '#131a2b', border: '1px solid #1e293b', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Sliders size={18} color="#a855f7" />
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#f8fafc' }}>
                    Engine Orchestration Parameters
                  </h3>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                    Worker Node Identifier
                  </label>
                  <input
                    type="text"
                    value={engineSettings.workerId}
                    onChange={(e) => setEngineSettings({ ...engineSettings, workerId: e.target.value })}
                    style={{
                      width: '100%',
                      background: '#090e18',
                      border: '1px solid #1e293b',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      color: '#f8fafc',
                      fontFamily: 'JetBrains Mono, monospace',
                      fontSize: '13px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                      Worker Lease Duration: {engineSettings.leaseDurationSec}s
                    </label>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      value={engineSettings.leaseDurationSec}
                      onChange={(e) => setEngineSettings({ ...engineSettings, leaseDurationSec: parseInt(e.target.value) || 25 })}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
                      Max Retry Attempts: {engineSettings.maxAttempts}
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      value={engineSettings.maxAttempts}
                      onChange={(e) => setEngineSettings({ ...engineSettings, maxAttempts: parseInt(e.target.value) || 3 })}
                      style={{ width: '100%', accentColor: '#38bdf8' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                  <input
                    type="checkbox"
                    id="simCheck"
                    checked={engineSettings.allowFailureSimulation}
                    onChange={(e) => setEngineSettings({ ...engineSettings, allowFailureSimulation: e.target.checked })}
                  />
                  <label htmlFor="simCheck" style={{ fontSize: '13px', color: '#f8fafc', cursor: 'pointer' }}>
                    Allow Development Failure Simulation (Crash / Retry Injection)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px' }}>
                  <button
                    className="btn-demo"
                    onClick={handleClearAllCompleted}
                    style={{ color: '#f87171' }}
                  >
                    Clear All Executions
                  </button>

                  <button
                    className="btn-start"
                    onClick={handleSaveSettings}
                  >
                    Save Engine Settings
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* 3. View Logs Drawer (PostgreSQL Event Audit Trail) */}
      {showLogsDrawer && (
        <div className="drawer-overlay" onClick={() => setShowLogsDrawer(false)}>
          <div className="drawer-panel" onClick={(e) => e.stopPropagation()}>
            <div className="drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={16} color="#38bdf8" />
                <h3 style={{ fontSize: '15px', fontWeight: 700 }}>PostgreSQL Audit Event Logs</h3>
              </div>
              <button
                onClick={() => setShowLogsDrawer(false)}
                style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <div className="drawer-body">
              {events.length === 0 ? (
                <div style={{ color: '#64748b', textAlign: 'center', padding: '30px' }}>
                  No events logged yet for this execution.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      style={{
                        background: '#090e18',
                        border: '1px solid #1a2234',
                        borderLeft:
                          evt.eventType === 'RECOVERY_PERFORMED'
                            ? '3px solid #a855f7'
                            : evt.eventType === 'RETRY_SCHEDULED'
                            ? '3px solid #f59e0b'
                            : evt.eventType === 'STEP_COMPLETED' || evt.eventType === 'EXECUTION_COMPLETED'
                            ? '3px solid #10b981'
                            : evt.eventType === 'STEP_FAILED' || evt.eventType === 'EXECUTION_FAILED'
                            ? '3px solid #ef4444'
                            : '3px solid #38bdf8',
                        padding: '10px 14px',
                        borderRadius: '6px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '10px' }}>
                        <span style={{ fontWeight: 700, color: '#38bdf8' }}>{evt.eventType}</span>
                        <span>{new Date(evt.createdAt).toLocaleTimeString()}</span>
                      </div>
                      <div style={{ color: '#f8fafc', fontSize: '12px' }}>{evt.message}</div>
                      {evt.detailsJson && (
                        <pre
                          style={{
                            background: '#040711',
                            padding: '6px',
                            borderRadius: '4px',
                            color: '#94a3b8',
                            fontSize: '10px',
                            overflowX: 'auto',
                          }}
                        >
                          {evt.detailsJson}
                        </pre>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 4. Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateCustomOrder}
        isLoading={isLoading}
        currentCustomerName={userProfile.name}
      />

      {/* 5. Auth / User Account Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={userProfile}
        onUpdateUser={handleUpdateUserProfile}
      />
    </div>
  );
};
