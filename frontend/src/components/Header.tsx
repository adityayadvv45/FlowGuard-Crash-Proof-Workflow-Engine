import React from 'react';
import { ShieldCheck, Activity, Cpu } from 'lucide-react';

interface HeaderProps {
  isPolling: boolean;
}

export const Header: React.FC<HeaderProps> = ({ isPolling }) => {
  return (
    <header className="app-header">
      <div className="brand">
        <div className="brand-icon">
          <ShieldCheck size={28} color="#f8fafc" />
        </div>
        <div>
          <h1 className="brand-title">FlowGuard</h1>
          <p className="brand-subtitle">Crash-Proof Workflow Engine • PostgreSQL State Machine</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
        <div className="system-status">
          <Cpu size={14} color="#38bdf8" />
          <span>Worker: flowguard-worker-1</span>
        </div>
        <div className="system-status">
          <div className="status-dot" style={{ backgroundColor: isPolling ? '#38bdf8' : '#10b981' }} />
          <span>{isPolling ? 'Live Engine Polling (2s)' : 'Engine Idle'}</span>
          <Activity size={14} color={isPolling ? '#38bdf8' : '#10b981'} />
        </div>
      </div>
    </header>
  );
};
