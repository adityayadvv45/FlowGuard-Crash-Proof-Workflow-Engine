import React from 'react';

interface SkeletonProps {
  height?: string | number;
  width?: string | number;
  borderRadius?: string | number;
  style?: React.CSSProperties;
}

export const LoadingSkeleton: React.FC<SkeletonProps> = ({
  height = '18px',
  width = '100%',
  borderRadius = '6px',
  style = {},
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: '#161b22',
        backgroundImage: 'linear-gradient(90deg, #161b22 0%, #21262d 50%, #161b22 100%)',
        backgroundSize: '200% 100%',
        animation: 'skeleton-shimmer 1.8s infinite ease-in-out',
        ...style,
      }}
    />
  );
};
