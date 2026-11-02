import React, { useEffect, useState, useCallback } from 'react';
import {
  WorkflowDefinition,
  ExecutionResponse,
  WorkflowStats,
  SystemHealthResponse,
  TabType,
  WorkflowStatus,
  UserAccount,
} from './types';
import * as api from './services/api';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { OverviewPage } from './pages/Overview/OverviewPage';
import { WorkflowsPage } from './pages/Workflows/WorkflowsPage';
import { ExecutionsPage } from './pages/Executions/ExecutionsPage';
import { ExecutionDetailPage } from './pages/ExecutionDetail/ExecutionDetailPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { EventHistoryPage } from './pages/EventHistory/EventHistoryPage';
import { SystemHealthPage } from './pages/SystemHealth/SystemHealthPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { CreateOrderModal } from './components/CreateOrderModal';
import { ModalJsonViewer } from './components/ModalJsonViewer';
import { AuthModal } from './components/AuthModal';

const DEFAULT_DEV_USER: UserAccount = {
  id: 'b0000000-0000-0000-0000-000000000001',
  username: 'aditya',
  email: 'aditya@flowlab.dev',
  fullName: 'Aditya Yadav',
  role: 'Lead Backend Engineer',
  createdAt: '2026-10-01T00:00:00Z',
  lastLoginAt: null,
};

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);

  // Authentication & Active User
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(() => {
    const saved = localStorage.getItem('flowguard_user');
    return saved ? JSON.parse(saved) : DEFAULT_DEV_USER;
  });
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);

  // Core Data
  const [workflows, setWorkflows] = useState<WorkflowDefinition[]>([]);
  const [executions, setExecutions] = useState<ExecutionResponse[]>([]);
  const [stats, setStats] = useState<WorkflowStats | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealthResponse | null>(null);
  const [totalElements, setTotalElements] = useState<number>(0);

  // Filters & Pagination
  const [page, setPage] = useState<number>(0);
  const [statusFilter, setStatusFilter] = useState<WorkflowStatus | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // UI States
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [jsonModal, setJsonModal] = useState<{ title: string; json: string | null } | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  // Sync user changes to localStorage
  const handleUserChange = (user: UserAccount | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('flowguard_user', JSON.stringify(user));
      showToast(`Logged in as ${user.fullName} (${user.role})`);
    } else {
      localStorage.removeItem('flowguard_user');
      showToast('Signed out of FlowGuard');
    }
  };

  // Check and verify user session on mount
  useEffect(() => {
    const token = api.getAuthToken();
    if (token) {
      api.fetchCurrentUser()
        .then((user) => {
          setCurrentUser(user);
          localStorage.setItem('flowguard_user', JSON.stringify(user));
        })
        .catch(() => {
          // If token verification fails, retain existing state or default
        });
    }
  }, []);

  // Fetch initial/periodic data
  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const [wfList, stList, hlth, execPage] = await Promise.all([
        api.fetchWorkflows().catch(() => []),
        api.fetchStats().catch(() => null),
        api.fetchSystemHealth().catch(() => null),
        api.fetchExecutions(page, 20, {
          status: statusFilter,
          search: searchQuery.trim() || undefined,
        }).catch(() => ({ content: [], totalElements: 0, totalPages: 1 })),
      ]);

      setWorkflows(wfList);
      if (stList) setStats(stList);
      if (hlth) setSystemHealth(hlth);
      setExecutions(execPage.content || []);
      setTotalElements(execPage.totalElements || 0);
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  }, [page, statusFilter, searchQuery]);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData(true);
    }, 4000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Order creation submission
  const handleCreateOrderSubmit = async (data: {
    orderId: string;
    amount: number;
    customerId: string;
    items: string[];
    idempotencyKey?: string;
    failAtStepKey?: string;
    failureMode?: 'CRASH' | 'TRANSIENT' | 'PERMANENT';
  }) => {
    if (workflows.length === 0) {
      showToast('No registered workflows available to execute');
      return;
    }
    const targetWorkflow = workflows[0];
    try {
      setIsSubmittingOrder(true);
      const res = await api.startExecution(targetWorkflow.id, {
        inputData: {
          orderId: data.orderId,
          amount: data.amount,
          customerId: data.customerId || (currentUser ? currentUser.fullName : 'Aditya Kumar'),
          items: data.items,
        },
        idempotencyKey: data.idempotencyKey,
        failAtStepKey: data.failAtStepKey,
        failureMode: data.failureMode,
      });

      setShowCreateModal(false);
      showToast(`Workflow execution started (${res.id.slice(0, 8)}…)`);
      setSelectedExecutionId(res.id);
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Failed to submit workflow');
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRetryExecution = async (id: string) => {
    try {
      await api.retryExecution(id);
      showToast('Retry signal dispatched to engine');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Retry failed');
    }
  };

  const handleCancelExecution = async (id: string) => {
    try {
      await api.cancelExecution(id);
      showToast('Cancellation signal dispatched');
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Cancel failed');
    }
  };

  const handleDeleteExecution = async (id: string) => {
    try {
      await api.deleteExecution(id);
      showToast('Execution record deleted');
      if (selectedExecutionId === id) {
        setSelectedExecutionId(null);
      }
      loadData(true);
    } catch (err: any) {
      showToast(err.message || 'Delete failed');
    }
  };

  // Selected Execution Detail Object
  const selectedExecution = executions.find((e) => e.id === selectedExecutionId) || null;

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        overflow: 'hidden',
        backgroundColor: '#07090e',
        color: '#f0f6fc',
        fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Toast Notification */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            right: '24px',
            zIndex: 9999,
            backgroundColor: '#161b22',
            border: '1px solid #38bdf8',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
            padding: '10px 18px',
            borderRadius: '8px',
            fontSize: '0.80rem',
            color: '#f0f6fc',
            fontWeight: 500,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          {toast}
        </div>
      )}

      {/* Left Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onTabChange={(tab) => {
          setSelectedExecutionId(null);
          setCurrentTab(tab);
        }}
        systemHealth={systemHealth}
        currentUser={currentUser}
        onOpenAuth={() => setShowAuthModal(true)}
      />

      {/* Main Content Area */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          overflow: 'hidden',
          backgroundColor: '#090d16',
        }}
      >
        {/* Global Top Header */}
        <Header
          currentTab={currentTab}
          selectedExecutionId={selectedExecutionId}
          onBackToExecutions={() => setSelectedExecutionId(null)}
          onRefresh={() => loadData(false)}
          onNewOrder={() => setShowCreateModal(true)}
          isRefreshing={isRefreshing}
          searchQuery={searchQuery}
          onSearchChange={(q) => {
            setSearchQuery(q);
            setPage(0);
          }}
          currentUser={currentUser}
          onOpenAuth={() => setShowAuthModal(true)}
        />

        {/* Scrollable Page Body */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px 28px',
          }}
        >
          {/* Deep Execution Detail View */}
          {selectedExecutionId && selectedExecution ? (
            <ExecutionDetailPage
              execution={selectedExecution}
              onBack={() => setSelectedExecutionId(null)}
              onRetry={handleRetryExecution}
              onCancel={handleCancelExecution}
              onDelete={handleDeleteExecution}
              onViewJson={(title, json) => setJsonModal({ title, json })}
            />
          ) : (
            <>
              {currentTab === 'overview' && (
                <OverviewPage
                  stats={stats}
                  executions={executions}
                  systemHealth={systemHealth}
                  onSelectExecution={(id) => setSelectedExecutionId(id)}
                  onNewOrder={() => setShowCreateModal(true)}
                  onSimulateCrash={() => setShowCreateModal(true)}
                  onNavigateToExecutions={() => setCurrentTab('executions')}
                />
              )}

              {currentTab === 'workflows' && (
                <WorkflowsPage
                  workflows={workflows}
                  onLaunchWorkflow={(id) => setShowCreateModal(true)}
                  onViewJson={(title, json) => setJsonModal({ title, json })}
                />
              )}

              {currentTab === 'executions' && (
                <ExecutionsPage
                  executions={executions}
                  totalElements={totalElements}
                  currentPage={page}
                  onPageChange={(p) => setPage(p)}
                  onSelectExecution={(id) => setSelectedExecutionId(id)}
                  onRetry={handleRetryExecution}
                  onCancel={handleCancelExecution}
                  statusFilter={statusFilter}
                  onStatusFilterChange={(st) => {
                    setStatusFilter(st);
                    setPage(0);
                  }}
                  searchQuery={searchQuery}
                  onSearchChange={(q) => {
                    setSearchQuery(q);
                    setPage(0);
                  }}
                />
              )}

              {currentTab === 'analytics' && (
                <AnalyticsPage
                  onSelectExecution={(id) => setSelectedExecutionId(id)}
                />
              )}

              {currentTab === 'events' && (
                <EventHistoryPage
                  onSelectExecution={(id) => setSelectedExecutionId(id)}
                  onViewJson={(title, json) => setJsonModal({ title, json })}
                />
              )}

              {currentTab === 'health' && (
                <SystemHealthPage
                  systemHealth={systemHealth}
                  onRefresh={() => loadData(false)}
                  isRefreshing={isRefreshing}
                />
              )}

              {currentTab === 'settings' && (
                <SettingsPage
                  currentUser={currentUser}
                  onOpenAuth={() => setShowAuthModal(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Create Order Modal */}
      <CreateOrderModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateOrderSubmit}
        isLoading={isSubmittingOrder}
        currentCustomerName={currentUser ? currentUser.fullName : 'Aditya Kumar'}
      />

      {/* JSON Viewer Modal */}
      {jsonModal && (
        <ModalJsonViewer
          title={jsonModal.title}
          jsonString={jsonModal.json}
          onClose={() => setJsonModal(null)}
        />
      )}

      {/* Authentication & Account Details Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        currentUser={currentUser}
        onUserChange={handleUserChange}
      />
    </div>
  );
};
