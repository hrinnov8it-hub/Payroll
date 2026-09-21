import React from 'react';

export const Spinner: React.FC<{ size?: 'sm' | 'md' | 'lg'; color?: string }> = ({
  size = 'md',
  color = 'var(--brand-blue)',
}) => {
  const sizeMap = {
    sm: 16,
    md: 24,
    lg: 36,
  };
  const px = sizeMap[size];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <svg
        width={px}
        height={px}
        viewBox="0 0 24 24"
        fill="none"
        style={{ animation: 'spin 1s linear infinite' }}
      >
        <circle cx="12" cy="12" r="10" stroke="#e2e8f0" strokeWidth="3" />
        <path
          d="M12 2a10 10 0 0 1 10 10"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};

export const Skeleton: React.FC<{
  width?: string | number;
  height?: string | number;
  borderRadius?: string;
  className?: string;
}> = ({ width = '100%', height = '1rem', borderRadius = 'var(--radius-sm)', className = '' }) => (
  <div
    className={`skeleton-loader ${className}`}
    style={{
      width,
      height,
      borderRadius,
    }}
  />
);

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({
  rows = 4,
  cols = 5,
}) => (
  <div className="table-skeleton-wrap">
    {Array.from({ length: rows }).map((_, rIdx) => (
      <div key={rIdx} className="table-skeleton-row">
        {Array.from({ length: cols }).map((_, cIdx) => (
          <Skeleton key={cIdx} height="18px" width={cIdx === 0 ? '40%' : '80%'} />
        ))}
      </div>
    ))}
  </div>
);

export interface LoadingStateProps {
  title?: string;
  message?: string;
  className?: string;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  title = 'Loading...',
  message,
  className = '',
}) => (
  <div
    className={className}
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: '3rem 1.5rem',
      gap: '0.85rem',
    }}
  >
    <Spinner size="lg" />
    <h4 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--brand-dark-blue)' }}>{title}</h4>
    {message && (
      <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', maxWidth: '400px' }}>
        {message}
      </p>
    )}
  </div>
);

