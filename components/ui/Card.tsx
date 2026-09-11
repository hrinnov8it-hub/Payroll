import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`card ${className}`} {...props}>
    {children}
  </div>
);

export const CardHeader: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`card-header ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <h3 className={`card-title ${className}`} {...props}>
    {children}
  </h3>
);

export const CardSubtitle: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <p className={`card-subtitle ${className}`} {...props}>
    {children}
  </p>
);

export const CardBody: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`card-body ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<CardProps> = ({ className = '', children, ...props }) => (
  <div className={`card-footer ${className}`} {...props}>
    {children}
  </div>
);
