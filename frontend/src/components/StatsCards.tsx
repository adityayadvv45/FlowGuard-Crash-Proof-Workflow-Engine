import React from 'react';
import { WorkflowStats } from '../types';
import { Layers, PlayCircle, CheckCircle2, AlertTriangle } from 'lucide-react';

interface StatsCardsProps {
  stats: WorkflowStats | null;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ stats }) => {
  const cards = [
    {
      label: 'Total Executions',
      value: stats?.totalExecutions ?? 0,
      icon: Layers,
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.1)',
    },
    {
      label: 'Active / Running',
      value: stats?.runningExecutions ?? 0,
      icon: PlayCircle,
      color: '#60a5fa',
      bg: 'rgba(96, 165, 250, 0.1)',
    },
    {
      label: 'Completed',
      value: stats?.completedExecutions ?? 0,
      icon: CheckCircle2,
      color: '#34d399',
      bg: 'rgba(52, 211, 153, 0.1)',
    },
    {
      label: 'Failed / Interrupted',
      value: stats?.failedExecutions ?? 0,
      icon: AlertTriangle,
      color: '#f87171',
      bg: 'rgba(248, 113, 113, 0.1)',
    },
  ];

  return (
    <div className="stats-grid">
      {cards.map((c, i) => {
        const Icon = c.icon;
        return (
          <div key={i} className="stat-card">
            <div className="stat-info">
              <span className="stat-label">{c.label}</span>
              <span className="stat-value">{c.value}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: c.bg, color: c.color }}>
              <Icon size={24} />
            </div>
          </div>
        );
      })}
    </div>
  );
};
