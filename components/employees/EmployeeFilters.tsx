'use client';

import React from 'react';
import { Department, EmployeeFilters as FilterType, EmploymentType, PayType, EmployeeStatus } from '@/types/employee';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

interface EmployeeFiltersProps {
  filters: FilterType;
  departments: Department[];
  onChange: (filters: FilterType) => void;
  onReset: () => void;
}

export const EmployeeFilters: React.FC<EmployeeFiltersProps> = ({
  filters,
  departments,
  onChange,
  onReset,
}) => {
  const hasActiveFilters = Boolean(
    filters.search ||
    (filters.department_id && filters.department_id !== 'all') ||
    (filters.status && filters.status !== 'all') ||
    (filters.employment_type && filters.employment_type !== 'all') ||
    (filters.pay_type && filters.pay_type !== 'all')
  );

  return (
    <div className="employee-filter-bar">
      <div className="filter-search-box">
        <Input
          placeholder="Search by name, employee ID, or email..."
          value={filters.search || ''}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          }
        />
      </div>

      <div className="filter-dropdown-group">
        <div className="filter-item">
          <Select
            value={filters.department_id || 'all'}
            onChange={(e) => onChange({ ...filters, department_id: e.target.value })}
            options={[
              { label: 'All Departments', value: 'all' },
              ...departments.map((d) => ({ label: d.name, value: d.id })),
            ]}
          />
        </div>

        <div className="filter-item">
          <Select
            value={filters.status || 'all'}
            onChange={(e) => onChange({ ...filters, status: e.target.value as EmployeeStatus | 'all' })}
            options={[
              { label: 'All Statuses', value: 'all' },
              { label: 'Active Only', value: 'active' },
              { label: 'Inactive / On Leave', value: 'inactive' },
              { label: 'Terminated', value: 'terminated' },
            ]}
          />
        </div>

        <div className="filter-item">
          <Select
            value={filters.employment_type || 'all'}
            onChange={(e) =>
              onChange({ ...filters, employment_type: e.target.value as EmploymentType | 'all' })
            }
            options={[
              { label: 'All Types', value: 'all' },
              { label: 'Regular Full-Time', value: 'regular' },
              { label: 'Probationary', value: 'probationary' },
              { label: 'Contractual', value: 'contractual' },
              { label: 'Part-Time', value: 'part_time' },
            ]}
          />
        </div>

        <div className="filter-item">
          <Select
            value={filters.pay_type || 'all'}
            onChange={(e) => onChange({ ...filters, pay_type: e.target.value as PayType | 'all' })}
            options={[
              { label: 'All Pay Schedules', value: 'all' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Daily', value: 'daily' },
              { label: 'Hourly', value: 'hourly' },
            ]}
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="md" onClick={onReset} style={{ whiteSpace: 'nowrap' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '4px' }}>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
};
