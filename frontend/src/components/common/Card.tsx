import React from 'react';

interface CardProps {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  noPadding?: boolean;
}

export const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  action,
  badge,
  children,
  className = '',
  style = {},
  noPadding = false,
}) => {
  const hasHeader = title || subtitle || action || badge;

  return (
    <div
      className={`fg-card ${className}`}
      style={{
        backgroundColor: '#0d1117',
        border: '1px solid #21262d',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.45)',
        transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
    >
      {hasHeader && (
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #1c2128',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            backgroundColor: 'rgba(255, 255, 255, 0.015)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div>
              {title && (
                <h3
                  style={{
                    fontSize: '0.92rem',
                    fontWeight: 600,
                    color: '#f0f6fc',
                    letterSpacing: '-0.01em',
                    margin: 0,
                  }}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p
                  style={{
                    fontSize: '0.78rem',
                    color: '#8b949e',
                    margin: '3px 0 0 0',
                  }}
                >
                  {subtitle}
                </p>
              )}
            </div>
            {badge}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      <div style={{ padding: noPadding ? 0 : '20px' }}>{children}</div>
    </div>
  );
};
