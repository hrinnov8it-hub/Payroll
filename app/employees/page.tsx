'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
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
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Employee Management</h1>
          <p>Innov8IT Master Staff Directory, Position Hierarchy & Compensation Profiles</p>
        </div>
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
      </div>

      {/* KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Total Headcount</span>
            <div className="stat-icon stat-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{totalCount}</div>
          <div className="stat-subtext">
            <span>Enrolled Personnel</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Active on Payroll</span>
            <div className="stat-icon stat-icon-dark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{activeCount}</div>
          <div className="stat-subtext">
            <Badge variant="success" dot>Active in Cutoffs</Badge>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Inactive / Separated</span>
            <div className="stat-icon stat-icon-accent">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{inactiveCount}</div>
          <div className="stat-subtext">
            <span>On Leave or Terminated</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Monthly Base Payroll</span>
            <div className="stat-icon stat-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value number-mono">
            ₱{totalMonthlyPayroll.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext">
            <span>Active Staff Sum</span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <EmployeeFilters
        filters={filters}
        departments={departments}
        onChange={setFilters}
        onReset={handleResetFilters}
      />

      {/* Directory Table Card */}
      <Card style={{ marginTop: '1.5rem' }}>
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
                  <TableHeaderCell>Department & Role</TableHeaderCell>
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
                          {emp.position?.title || 'Unassigned Position'}
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
