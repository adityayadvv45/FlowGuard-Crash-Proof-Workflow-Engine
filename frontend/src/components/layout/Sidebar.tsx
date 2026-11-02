import React from 'react';
import {
  Activity,
  Layers,
  PlayCircle,
  BarChart3,
  FileText,
  Cpu,
  Sliders,
  ShieldCheck,
  Server,
  User,
  LogIn,
  ChevronRight,
} from 'lucide-react';
import { TabType, SystemHealthResponse, UserAccount } from '../../types';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  systemHealth: SystemHealthResponse | null;
  currentUser: UserAccount | null;
  onOpenAuth: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  systemHealth,
  currentUser,
  onOpenAuth,
}) => {
  const navItems: { id: TabType; label: string; icon: React.ElementType; badge?: string }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'workflows', label: 'Workflows', icon: Layers },
    { id: 'executions', label: 'Executions', icon: PlayCircle },
    { id: 'analytics', label: 'Statistical Analytics', icon: BarChart3 },
    { id: 'events', label: 'Event History', icon: FileText },
    { id: 'health', label: 'System Health', icon: Cpu, badge: systemHealth?.status === 'UP' ? 'Live' : undefined },
    { id: 'settings', label: 'Engine Settings', icon: Sliders },
  ];

  return (
    <aside
      style={{
        width: '240px',
        minWidth: '240px',
        backgroundColor: '#0a0d14',
        borderRight: '1px solid #1c2128',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        userSelect: 'none',
        height: '100%',
      }}
    >
      {/* Top Branding */}
      <div>
        <div
          style={{
            padding: '20px 18px 16px 18px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            borderBottom: '1px solid #161b22',
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #0284c7 0%, #2563eb 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 0 16px rgba(2, 132, 199, 0.4)',
            }}
          >
            <ShieldCheck size={18} strokeWidth={2.2} />
          </div>
          <div>
            <div
              style={{
                fontSize: '0.92rem',
                fontWeight: 700,
                color: '#f0f6fc',
                letterSpacing: '-0.02em',
                lineHeight: 1.1,
              }}
            >
              FlowGuard
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: '#6e7681',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                marginTop: '2px',
              }}
            >
              Engine 2.0 • SDE
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <nav style={{ padding: '12px 10px' }}>
          <div
            style={{
              fontSize: '0.66rem',
              color: '#6e7681',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              padding: '6px 10px',
              fontWeight: 600,
            }}
          >
            Platform
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '7px',
                    border: 'none',
                    backgroundColor: isActive ? '#161b22' : 'transparent',
                    color: isActive ? '#f0f6fc' : '#8b949e',
                    fontSize: '0.82rem',
                    fontWeight: isActive ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.03)';
                      e.currentTarget.style.color = '#c9d1d9';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = '#8b949e';
                    }
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Icon
                      size={16}
                      strokeWidth={isActive ? 2.2 : 1.75}
                      style={{ color: isActive ? '#38bdf8' : '#8b949e' }}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      style={{
                        fontSize: '0.66rem',
                        padding: '1px 6px',
                        borderRadius: '9999px',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                      }}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Bottom User Profile & Status */}
      <div
        style={{
          padding: '12px 14px',
          borderTop: '1px solid #161b22',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* User Account Pill */}
        {currentUser ? (
          <button
            onClick={onOpenAuth}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 10px',
              borderRadius: '7px',
              backgroundColor: '#161b22',
              border: '1px solid #21262d',
              color: '#f0f6fc',
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
              transition: 'border-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38bdf8')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#21262d')}
            title="Click to view Account Details"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
              <div
                style={{
                  width: '26px',
                  height: '26px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #0284c7, #2563eb)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '0.74rem',
                  color: '#ffffff',
                  flexShrink: 0,
                }}
              >
                {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'U'}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '0.76rem', fontWeight: 600, color: '#f0f6fc', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.fullName}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#8b949e', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                  {currentUser.role}
                </div>
              </div>
            </div>
            <ChevronRight size={13} style={{ color: '#8b949e', flexShrink: 0 }} />
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: 'rgba(56, 189, 248, 0.1)',
              border: '1px solid rgba(56, 189, 248, 0.3)',
              color: '#38bdf8',
              fontSize: '0.74rem',
              fontWeight: 600,
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <LogIn size={13} />
            <span>Sign In / Register</span>
          </button>
        )}

        {/* Node & Database Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: systemHealth?.status === 'UP' ? '#10b981' : '#f59e0b',
                boxShadow:
                  systemHealth?.status === 'UP'
                    ? '0 0 8px #10b981'
                    : '0 0 8px #f59e0b',
              }}
            />
            <span style={{ fontSize: '0.70rem', color: '#c9d1d9', fontWeight: 500 }}>
              {systemHealth?.workerId || 'flowguard-node-1'}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.66rem',
              color: '#6e7681',
              fontFamily: 'monospace',
            }}
          >
            v2.0
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 8px',
            borderRadius: '5px',
            backgroundColor: '#161b22',
            border: '1px solid #21262d',
          }}
        >
          <Server size={13} style={{ color: '#8b949e' }} />
          <div style={{ overflow: 'hidden' }}>
            <div style={{ fontSize: '0.66rem', color: '#8b949e', whiteSpace: 'nowrap' }}>
              Database
            </div>
            <div
              style={{
                fontSize: '0.70rem',
                color: systemHealth?.databaseStatus === 'CONNECTED' ? '#34d399' : '#f87171',
                fontWeight: 600,
              }}
            >
              {systemHealth?.databaseStatus || 'PostgreSQL OK'}
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
