import React from 'react';
import { getStatusStyle, getSeverityStyle } from '../../utils/formatters';

interface BadgeProps {
  status?: string;
  severity?: string;
  label?: string;
  size?: 'sm' | 'md';
  pulse?: boolean;
}

export const Badge: React.FC<BadgeProps> = ({ status, severity, label, size = 'md', pulse = false }) => {
  let bg = 'rgba(255, 255, 255, 0.06)';
  let border = 'rgba(255, 255, 255, 0.12)';
  let text = '#cbd5e1';
  let dotColor: string | undefined = undefined;
  let displayLabel = label || status || severity || '';

  if (status) {
    const s = getStatusStyle(status);
    bg = s.bg;
    border = s.border;
    text = s.text;
    dotColor = s.dot;
    if (!label) displayLabel = s.label;
  } else if (severity) {
    const s = getSeverityStyle(severity);
    bg = s.bg;
    border = s.border;
    text = s.text;
    dotColor = s.text;
  }

  const isSmall = size === 'sm';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 7px' : '3px 10px',
        borderRadius: '9999px',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color: text,
        fontSize: isSmall ? '0.72rem' : '0.78rem',
        fontWeight: 600,
        letterSpacing: '0.02em',
        lineHeight: 1.2,
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {dotColor && (
        <span
          style={{
            width: isSmall ? '5px' : '6px',
            height: isSmall ? '5px' : '6px',
            borderRadius: '50%',
            backgroundColor: dotColor,
            boxShadow: pulse ? `0 0 6px ${dotColor}` : undefined,
            animation: pulse ? 'pulse 2s infinite ease-in-out' : undefined,
          }}
        />
      )}
      {displayLabel}
    </span>
  );
};

