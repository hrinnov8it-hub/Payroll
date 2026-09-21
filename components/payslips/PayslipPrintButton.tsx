import React from 'react';
import { Button } from '@/components/ui/Button';

interface PayslipPrintButtonProps {
  variant?: 'primary' | 'dark' | 'accent' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  label?: string;
  className?: string;
}

export const PayslipPrintButton: React.FC<PayslipPrintButtonProps> = ({
  variant = 'primary',
  size = 'md',
  label = 'Print Payslip',
  className = '',
}) => {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handlePrint}
      className={`payslip-no-print ${className}`}
      id="btn-print-payslip"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ marginRight: '0.4rem' }}
      >
        <polyline points="6 9 6 2 18 2 18 9" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      {label}
    </Button>
  );
};
