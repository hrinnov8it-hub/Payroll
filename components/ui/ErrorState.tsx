import React from 'react';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`error-state-card ${className}`}>
      <div className="error-state-icon-box">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h4 className="error-state-title">{title}</h4>
      <p className="error-state-desc">{message}</p>
      {onRetry && (
        <div style={{ marginTop: '0.75rem' }}>
          <Button variant="danger" size="sm" onClick={onRetry}>
            Try Again
          </Button>
        </div>
      )}
    </div>
  );
};

export const AlertBanner: React.FC<{
  variant?: 'danger' | 'warning' | 'info' | 'success';
  title?: string;
  message: string;
  onClose?: () => void;
}> = ({ variant = 'danger', title, message, onClose }) => {
  return (
    <div className={`alert-banner alert-${variant}`}>
      <div className="alert-content">
        {title && <strong>{title}: </strong>}
        <span>{message}</span>
      </div>
      {onClose && (
        <button type="button" className="alert-close" onClick={onClose} aria-label="Close alert">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
    </div>
  );
};
