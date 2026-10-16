'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, WorkspaceStats, WorkspaceStat, PanelHeading } from '@/components/ui/Workspace';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmployeeFilters } from '@/components/employees/EmployeeFilters';
import {
  Department,
  EmployeeWithRelations,
  EmployeeFilters as FilterType,
  EmployeeStatus,
} from '@/types/employee';
import { getEmployees, getDepartments } from '@/lib/employees/actions';

export default function EmployeesPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState<FilterType>({
    search: '',
    department_id: 'all',
    status: 'all',
    employment_type: 'all',
    pay_type: 'all',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [empList, deptList] = await Promise.all([
        getEmployees(filters),
        getDepartments(),
      ]);
      setEmployees(empList);
      setDepartments(deptList);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleResetFilters = () => {
    setFilters({
      search: '',
      department_id: 'all',
      status: 'all',
      employment_type: 'all',
      pay_type: 'all',
    });
  };

  // KPI Calculations
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.status === 'active').length;
  const inactiveCount = employees.filter((e) => e.status === 'inactive' || e.status === 'terminated').length;
  const totalMonthlyPayroll = employees
    .filter((e) => e.status === 'active')
    .reduce((acc, curr) => acc + Number(curr.basic_salary || 0), 0);

  const getStatusBadge = (status: EmployeeStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" dot>Active</Badge>;
      case 'inactive':
        return <Badge variant="warning" dot>Inactive / Leave</Badge>;
      case 'terminated':
        return <Badge variant="danger" dot>Terminated</Badge>;
    }
  };

  const getEmploymentBadge = (type: string) => {
    switch (type) {
      case 'regular':
        return <Badge variant="brand">Regular</Badge>;
      case 'probationary':
        return <Badge variant="info">Probationary</Badge>;
      case 'contractual':
        return <Badge variant="neutral">Contractual</Badge>;
      case 'part_time':
        return <Badge variant="neutral">Part-Time</Badge>;
      default:
        return <Badge variant="neutral">{type}</Badge>;
    }
  };

  return (
    <AppShell pageTitle="Employee Directory">
      {/* Header Bar */}
      <PageHeader eyebrow="PEOPLE & ORGANIZATION" title="Employee directory" description="Manage your team, department assignments, and pay details." actions={<>
<div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button variant="outline" size="sm" onClick={() => loadData()}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            Refresh
          </Button>
          <Button variant="primary" size="sm" onClick={() => router.push('/employees/new')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Add New Employee
          </Button>
        </div>
</>} />

      {/* KPI Stats */}
      <WorkspaceStats label="Employee summary">
  <WorkspaceStat label="Team members" value={totalCount} hint="Employees in the current view" icon="people" loading={loading} />
  <WorkspaceStat label="Active on payroll" value={activeCount} hint="Employees with active status" icon="check" tone="green" loading={loading} />
  <WorkspaceStat label="Inactive or separated" value={inactiveCount} hint="Inactive and terminated employees" icon="clock" tone="amber" loading={loading} />
  <WorkspaceStat label="Base compensation" value={new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(totalMonthlyPayroll)} hint="Basic salary sum for active staff" icon="wallet" tone="blue" loading={loading} />
</WorkspaceStats>

      {/* Filter Bar */}
      <EmployeeFilters
        filters={filters}
        departments={departments}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Directory Table Card */}
      <Card style={{ marginTop: '1.5rem' }}>
<PanelHeading title="Employee directory" description="Profiles, departments, and compensation details." detail={employees.length + ' records'} />
        {loading ? (
          <div style={{ padding: '3rem 1rem' }}>
            <LoadingState title="Loading Staff Directory" message="Retrieving employee profiles, departments, and payroll details..." />
          </div>
        ) : employees.length === 0 ? (
          <EmptyState
            title="No Employees Found"
            description="No employee records matched your filter criteria or search query. Try clearing filters or adding a new employee."
            actionText="Add Employee"
            onAction={() => router.push('/employees/new')}
          />
        ) : (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee</TableHeaderCell>
                  <TableHeaderCell>Employee ID</TableHeaderCell>
                  <TableHeaderCell>Department & Designation</TableHeaderCell>
                  <TableHeaderCell>Type</TableHeaderCell>
                  <TableHeaderCell align="right">Basic Rate</TableHeaderCell>
                  <TableHeaderCell align="right">Hourly Basis</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell align="center">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {employees.map((emp) => {
                  const initials = `${emp.first_name[0] || ''}${emp.last_name[0] || ''}`.toUpperCase();
                  return (
                    <TableRow key={emp.id}>
                      <TableCell>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '38px',
                              height: '38px',
                              borderRadius: 'var(--radius-md)',
                              background: 'linear-gradient(135deg, var(--brand-dark-blue) 0%, var(--brand-blue) 100%)',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                              flexShrink: 0,
                            }}
                          >
                            {initials}
                          </div>
                          <div>
                            <Link
                              href={`/employees/${emp.id}`}
                              style={{
                                fontWeight: 600,
                                color: 'var(--brand-dark-blue)',
                                textDecoration: 'none',
                                display: 'block',
                              }}
                            >
                              {emp.last_name}, {emp.first_name} {emp.middle_name ? `${emp.middle_name[0]}.` : ''}
                            </Link>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              {emp.email}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-blue)' }}>
                          {emp.employee_number}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div style={{ fontWeight: 500, color: 'var(--text-main)' }}>
                          {emp.position?.title || 'Unassigned Designation'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {emp.department?.name || 'Unassigned Dept'}
                        </div>
                      </TableCell>
                      <TableCell>{getEmploymentBadge(emp.employment_type)}</TableCell>
                      <TableCell align="right">
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          ₱{Number(emp.basic_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                          /{emp.pay_type}
                        </div>
                      </TableCell>
                      <TableCell align="right">
                        <span style={{ fontFamily: 'monospace', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                          ₱{Number(emp.hourly_rate).toFixed(2)}/hr
                        </span>
                      </TableCell>
                      <TableCell>{getStatusBadge(emp.status)}</TableCell>
                      <TableCell align="center">
                        <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                          <Link href={`/employees/${emp.id}`}>
                            <Button variant="ghost" size="sm" title="View Profile">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                                <circle cx="12" cy="12" r="3" />
                              </svg>
                            </Button>
                          </Link>
                          <Link href={`/employees/${emp.id}/edit`}>
                            <Button variant="ghost" size="sm" title="Edit Employee">
                              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                              </svg>
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Card>
    </AppShell>
  );
}
