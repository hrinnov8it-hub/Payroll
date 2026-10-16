import React from 'react';
import Link from 'next/link';

interface ButtonStyleProps {
  variant?: 'primary' | 'dark' | 'accent' | 'outline' | 'ghost' | 'danger' | 'danger-outline' | 'success' | 'inverse' | 'soft';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullWidth?: boolean;
  iconOnly?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, ButtonStyleProps {
  isLoading?: boolean;
}

const buttonClasses = ({ variant = 'primary', size = 'md', fullWidth, iconOnly, className = '' }: ButtonStyleProps & { className?: string }) =>
  ['btn', `btn-${variant}`, size !== 'md' && `btn-${size}`, fullWidth && 'btn-block', iconOnly && 'btn-icon-only', className].filter(Boolean).join(' ');

const ButtonContent = ({ leftIcon, rightIcon, children }: Pick<ButtonStyleProps, 'leftIcon' | 'rightIcon'> & { children?: React.ReactNode }) => (
  <>
    {leftIcon && <span className="btn-icon-left">{leftIcon}</span>}
    {children != null && <span className="btn-label">{children}</span>}
    {rightIcon && <span className="btn-icon-right">{rightIcon}</span>}
  </>
);

export type ButtonLinkProps = React.ComponentProps<typeof Link> & ButtonStyleProps;

export const ButtonLink: React.FC<ButtonLinkProps> = ({ variant, size, fullWidth, iconOnly, leftIcon, rightIcon, className, children, ...props }) => (
  <Link className={buttonClasses({ variant, size, fullWidth, iconOnly, className })} {...props}>
    <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>{children}</ButtonContent>
  </Link>
);

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  iconOnly = false,
  isLoading = false,
  leftIcon,
  rightIcon,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const classes = buttonClasses({ variant, size, fullWidth, iconOnly, className });

  return (
    <button className={classes} disabled={disabled || isLoading} aria-busy={isLoading || undefined} {...props}>
      {isLoading ? (
        <>
          <svg
            className="btn-spinner"
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="12" cy="12" r="10" strokeWidth="4" opacity="0.25" />
            <path
              d="M12 2a10 10 0 0 1 10 10"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </svg>
          {!iconOnly && <span className="btn-label">Loading...</span>}
        </>
      ) : (
        <ButtonContent leftIcon={leftIcon} rightIcon={rightIcon}>{children}</ButtonContent>
      )}
    </button>
  );
};
