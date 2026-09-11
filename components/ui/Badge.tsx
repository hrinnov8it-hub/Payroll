import React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'brand' | 'brand-dark' | 'brand-accent' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  size?: 'sm' | 'md';
  dot?: boolean;
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'brand',
  size = 'md',
  dot = false,
  className = '',
  children,
  ...props
}) => {
  const sizeClass = size === 'sm' ? 'badge-sm' : '';

  return (
    <span className={`badge badge-${variant} ${sizeClass} ${className}`} {...props}>
      {dot && <span className="badge-dot" />}
      <span>{children}</span>
    </span>
  );
};
