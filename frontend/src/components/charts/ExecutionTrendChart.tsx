import React, { useState } from 'react';
import { ExecutionResponse } from '../../types';
import { formatDuration, formatDateTime } from '../../utils/formatters';

interface ExecutionTrendChartProps {
  executions: ExecutionResponse[];
  height?: number;
}

export const ExecutionTrendChart: React.FC<ExecutionTrendChartProps> = ({
  executions,
  height = 160,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Take the last 20 executions in chronological order
  const validExecutions = [...executions]
    .filter((e) => e.durationMillis !== null && e.durationMillis > 0)
    .slice(0, 24)
    .reverse();

  if (validExecutions.length < 2) {
    return (
      <div
        style={{
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#6e7681',
          fontSize: '0.82rem',
          backgroundColor: 'rgba(255, 255, 255, 0.01)',
          borderRadius: '8px',
          border: '1px dashed #21262d',
        }}
      >
        Waiting for at least 2 completed executions to generate trend baseline...
      </div>
    );
  }

  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 28;
  const width = 640;

  const durations = validExecutions.map((e) => e.durationMillis || 0);
  const minVal = 0;
  const maxVal = Math.max(...durations, 1000) * 1.15;

  const points = validExecutions.map((e, i) => {
    const x = paddingLeft + (i / (validExecutions.length - 1)) * (width - paddingLeft - paddingRight);
    const y = height - paddingBottom - ((e.durationMillis || 0) / maxVal) * (height - paddingTop - paddingBottom);
    return { x, y, execution: e };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cp1x = prev.x + (pt.x - prev.x) / 2;
    const cp1y = prev.y;
    const cp2x = prev.x + (pt.x - prev.x) / 2;
    const cp2y = pt.y;
    return `${acc} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: '100%', height: 'auto', overflow: 'visible' }}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="trendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <line
          x1={paddingLeft}
          y1={paddingTop}
          x2={width - paddingRight}
          y2={paddingTop}
          stroke="#21262d"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingLeft}
          y1={(height - paddingBottom + paddingTop) / 2}
          x2={width - paddingRight}
          y2={(height - paddingBottom + paddingTop) / 2}
          stroke="#21262d"
          strokeDasharray="3 3"
        />
        <line
          x1={paddingLeft}
          y1={height - paddingBottom}
          x2={width - paddingRight}
          y2={height - paddingBottom}
          stroke="#30363d"
        />

        {/* Y-axis labels */}
        <text
          x={paddingLeft - 8}
          y={paddingTop + 4}
          fill="#8b949e"
          fontSize="10"
          textAnchor="end"
          fontFamily="monospace"
        >
          {formatDuration(maxVal)}
        </text>
        <text
          x={paddingLeft - 8}
          y={(height - paddingBottom + paddingTop) / 2 + 4}
          fill="#8b949e"
          fontSize="10"
          textAnchor="end"
          fontFamily="monospace"
        >
          {formatDuration(maxVal / 2)}
        </text>
        <text
          x={paddingLeft - 8}
          y={height - paddingBottom + 4}
          fill="#8b949e"
          fontSize="10"
          textAnchor="end"
          fontFamily="monospace"
        >
          0ms
        </text>

        {/* Gradient Area Fill */}
        <path d={areaD} fill="url(#trendGradient)" />

        {/* Trend Line */}
        <path d={pathD} fill="none" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

        {/* Interactive Data Points */}
        {points.map((pt, i) => {
          const isFailed = pt.execution.status === 'FAILED';
          const isHovered = hoveredIdx === i;
          return (
            <g
              key={pt.execution.id}
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
            >
              <circle
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 6 : isFailed ? 4.5 : 3}
                fill={isFailed ? '#ef4444' : '#38bdf8'}
                stroke="#0d1117"
                strokeWidth={2}
              />
            </g>
          );
        })}
      </svg>

      {/* Floating Tooltip */}
      {hoveredPoint && (
        <div
          style={{
            position: 'absolute',
            left: `${(hoveredPoint.x / width) * 100}%`,
            top: `${(hoveredPoint.y / height) * 100}%`,
            transform: 'translate(-50%, -125%)',
            backgroundColor: '#161b22',
            border: '1px solid #30363d',
            borderRadius: '6px',
            padding: '6px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            zIndex: 10,
          }}
        >
          <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#f0f6fc' }}>
            {formatDuration(hoveredPoint.execution.durationMillis)}
          </div>
          <div style={{ fontSize: '0.70rem', color: '#8b949e' }}>
            {hoveredPoint.execution.status} • {formatDateTime(hoveredPoint.execution.createdAt)}
          </div>
        </div>
      )}
    </div>
  );
};

