import React from 'react';

export interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon-only';
  theme?: 'dark' | 'light';
  className?: string;
  withCard?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  theme = 'light',
  className = '',
  withCard = false,
}) => {
  const heightMap = {
    sm: 28,
    md: 36,
    lg: 46,
    xl: 60,
  };

  const height = heightMap[size];

  const shouldWrapCard = withCard || theme === 'dark';

  const logoImage = (
    <img
      src="/images/innov8it-logo.png"
      alt="Innov8IT Logo"
      style={{
        height: `${height}px`,
        width: 'auto',
        objectFit: 'contain',
        display: 'block',
      }}
    />
  );

  if (shouldWrapCard) {
    return (
      <div
        className={`innov8it-logo-card ${className}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          backgroundColor: '#ffffff',
          padding: '4px 10px',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.12)',
        }}
      >
        {logoImage}
      </div>
    );
  }

  return (
    <div
      className={`innov8it-logo-wrap ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
      }}
    >
      {logoImage}
    </div>
  );
};

export const LogoIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 36,
  className = '',
}) => {
  // Crop to the infinity symbol portion or render vector infinity loop with official brand gradients
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        <linearGradient id="inf-blue" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#399ca2" />
          <stop offset="100%" stopColor="#1f757b" />
        </linearGradient>
        <linearGradient id="inf-accent" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e2a025" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
      </defs>
      {/* Left Teal Loop */}
      <path
        d="M16 8C11.58 8 8 11.58 8 16C8 20.42 11.58 24 16 24C19.5 24 22.3 21.6 24 16C22.3 10.4 19.5 8 16 8Z"
        stroke="url(#inf-blue)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Right Amber Loop */}
      <path
        d="M32 8C27.5 8 24.7 11.6 24 16C25.7 21.6 28.5 24 32 24C36.42 24 40 20.42 40 16C40 11.58 36.42 8 32 8Z"
        stroke="url(#inf-accent)"
        strokeWidth="4.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};
