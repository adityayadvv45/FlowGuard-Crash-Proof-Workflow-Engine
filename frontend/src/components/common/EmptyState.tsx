import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  action,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '50px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid #21262d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#8b949e',
          marginBottom: '16px',
        }}
      >
        <Icon size={24} strokeWidth={1.75} />
      </div>
      <h4
        style={{
          fontSize: '0.95rem',
          fontWeight: 600,
          color: '#f0f6fc',
          margin: '0 0 6px 0',
        }}
      >
        {title}
      </h4>
      <p
        style={{
          fontSize: '0.82rem',
          color: '#8b949e',
          maxWidth: '380px',
          margin: '0 0 20px 0',
          lineHeight: 1.5,
        }}
      >
        {description}
      </p>
      {action && <div>{action}</div>}
    </div>
  );
};
