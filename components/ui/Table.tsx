import React from 'react';

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  striped?: boolean;
  hoverable?: boolean;
  compact?: boolean;
  children: React.ReactNode;
}

export const TableContainer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <div className={`table-container ${className}`} {...props}>
    {children}
  </div>
);

export const Table: React.FC<TableProps> = ({
  striped = false,
  hoverable = true,
  compact = false,
  className = '',
  children,
  ...props
}) => {
  const classes = [
    'table',
    striped ? 'table-striped' : '',
    hoverable ? 'table-hover' : '',
    compact ? 'table-compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <table className={classes} {...props}>
      {children}
    </table>
  );
};

export const TableHead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <thead className={className} {...props}>
    {children}
  </thead>
);

export const TableBody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tbody className={className} {...props}>
    {children}
  </tbody>
);

export const TableRow: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <tr className={className} {...props}>
    {children}
  </tr>
);

export const TableHeaderCell: React.FC<React.ThHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <th className={className} {...props}>
    {children}
  </th>
);

export const TableCell: React.FC<React.TdHTMLAttributes<HTMLTableCellElement>> = ({
  className = '',
  children,
  ...props
}) => (
  <td className={className} {...props}>
    {children}
  </td>
);
