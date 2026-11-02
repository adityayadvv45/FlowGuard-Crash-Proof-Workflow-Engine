import React from 'react';
import { RefreshCw, Plus, Search, ChevronRight } from 'lucide-react';
import { TabType } from '../../types';

interface HeaderProps {
  currentTab: TabType;
  selectedExecutionId: string | null;
  onBackToExecutions?: () => void;
  onRefresh: () => void;
  onNewOrder: () => void;
  isRefreshing: boolean;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  selectedExecutionId,
  onBackToExecutions,
  onRefresh,
  onNewOrder,
  isRefreshing,
  searchQuery,
  onSearchChange,
}) => {
  const getTabTitle = (tab: TabType) => {
    switch (tab) {
      case 'overview':
        return 'System Overview';
      case 'workflows':
        return 'Workflow Definitions';
      case 'executions':
        return 'Execution Engine';
      case 'analytics':
        return 'Statistical Analytics';
      case 'events':
        return 'Event Audit History';
      case 'health':
        return 'Engine Health & Telemetry';
      case 'settings':
        return 'Engine Configuration';
      default:
        return 'FlowGuard';
    }
  };

  return (
    <header
      style={{
        height: '60px',
        minHeight: '60px',
        backgroundColor: '#0d1117',
        borderBottom: '1px solid #21262d',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        userSelect: 'none',
      }}
    >
      {/* Breadcrumb / Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span style={{ fontSize: '0.85rem', color: '#8b949e', fontWeight: 500 }}>
          {getTabTitle(currentTab)}
        </span>
        {selectedExecutionId && (
          <>
            <ChevronRight size={14} style={{ color: '#6e7681' }} />
            <button
              onClick={onBackToExecutions}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#38bdf8',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'monospace',
                padding: '2px 4px',
                borderRadius: '4px',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={(e) => (e.currentTarget.style.textDecoration = 'none')}
            >
              {selectedExecutionId.slice(0, 8)}…
            </button>
          </>
        )}
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Quick Search */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '5px 10px',
            width: '220px',
          }}
        >
          <Search size={14} style={{ color: '#8b949e', marginRight: '8px' }} />
          <input
            type="text"
            placeholder="Search executions, IDs..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#f0f6fc',
              fontSize: '0.78rem',
              width: '100%',
            }}
          />
        </div>

        {/* Refresh Button */}
        <button
          onClick={onRefresh}
          disabled={isRefreshing}
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
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            transition: 'background-color 0.15s ease',
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) e.currentTarget.style.backgroundColor = '#21262d';
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) e.currentTarget.style.backgroundColor = '#161b22';
          }}
        >
          <RefreshCw
            size={13}
            style={{
              animation: isRefreshing ? 'spin 1s linear infinite' : undefined,
              color: '#8b949e',
            }}
          />
          <span>Refresh</span>
        </button>

        {/* New Order CTA */}
        <button
          onClick={onNewOrder}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#238636',
            border: '1px solid rgba(240, 246, 252, 0.1)',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#ffffff',
            fontSize: '0.80rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 0 12px rgba(35, 134, 54, 0.35)',
            transition: 'background-color 0.15s ease, box-shadow 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2ea043';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#238636';
          }}
        >
          <Plus size={14} strokeWidth={2.4} />
          <span>New Order</span>
        </button>
      </div>
    </header>
  );
};
