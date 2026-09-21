'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeaderCell,
  TableCell,
  TableRow,
  TableHead,
  TableBody,
  TableContainer,
} from '@/components/ui/Table';
import { Payslip, PayslipAccessUser, PayslipStatus } from '@/types/payslip';
import { getPayslips, syncPayslipsFromRun } from '@/lib/payslips/actions';
import { getPayrollRuns } from '@/lib/payroll/runs-actions';
import { PayrollRun } from '@/types/payroll';

// Role simulation users for permission testing (Phase 10)
const SIMULATED_USERS: Record<string, PayslipAccessUser> = {
  admin: {
    id: 'user-admin-001',
    name: 'Innov8IT Admin',
    email: 'hr.innov8it@gmail.com',
    role: 'admin',
  },
  payroll_hr: {
    id: 'user-hr-001',
    name: 'Maria Santos (HR Manager)',
    email: 'maria.santos@innov8it.ph',
    role: 'payroll_hr',
  },
  employee_juan: {
    id: 'emp-001',
    name: 'Juan Dela Cruz (Employee)',
    email: 'juan.delacruz@innov8it.ph',
    role: 'employee',
    employeeId: 'emp-001',
  },
  employee_ana: {
    id: 'emp-002',
    name: 'Ana Patricia Reyes (Employee)',
    email: 'ana.reyes@innov8it.ph',
    role: 'employee',
    employeeId: 'emp-002',
  },
};

export default function PayslipsPage() {
  const [selectedUserKey, setSelectedUserKey] = useState<string>('admin');
  const currentUser = SIMULATED_USERS[selectedUserKey];

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const loadData = async (user: PayslipAccessUser) => {
    setLoading(true);
    try {
      // Sync any approved/paid runs if available
      const runsList = await getPayrollRuns();
      setRuns(runsList);

      for (const r of runsList) {
        if (r.status === 'approved' || r.status === 'paid' || r.status === 'locked') {
          await syncPayslipsFromRun(r.id);
        }
      }

      const list = await getPayslips(
        {
          status: statusFilter === 'all' ? undefined : (statusFilter as PayslipStatus),
          periodId: periodFilter === 'all' ? undefined : periodFilter,
          search: search || undefined,
        },
        user
      );
      setPayslips(list);
    } catch (err) {
      console.error('Failed to load payslips:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(currentUser);
  }, [selectedUserKey, statusFilter, periodFilter]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    startTransition(async () => {
      const list = await getPayslips(
        {
          status: statusFilter === 'all' ? undefined : (statusFilter as PayslipStatus),
          periodId: periodFilter === 'all' ? undefined : periodFilter,
          search: val || undefined,
        },
        currentUser
      );
      setPayslips(list);
    });
  };

  const getStatusBadge = (status: PayslipStatus) => {
    switch (status) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'viewed':
        return <Badge variant="brand">Viewed by Employee</Badge>;
      case 'generated':
      default:
        return <Badge variant="warning">Draft / Generated</Badge>;
    }
  };

  const formatCurrency = (val: number) => {
    return `₱${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  // Aggregates
  const totalNet = payslips.reduce((sum, p) => sum + Number(p.net_pay || 0), 0);
  const totalGross = payslips.reduce((sum, p) => sum + Number(p.gross_pay || 0), 0);
  const publishedCount = payslips.filter((p) => p.status === 'published' || p.status === 'viewed').length;

  return (
    <AppShell>
      <div className="dashboard-container" style={{ paddingBottom: '3rem' }}>
        {/* Header Area */}
        <div className="dashboard-header">
          <div className="dashboard-title-area">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
              <h1 style={{ margin: 0 }}>Payslips</h1>
              
            </div>
            <p>
              {currentUser.role === 'employee'
                ? `Personal and confidential payslip records for ${currentUser.name}`
                : 'Centralized employee payslip generation, review, distribution, and printing.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Link href="/payroll-runs">
              <Button variant="outline" size="sm">
                View Payroll Runs
              </Button>
            </Link>
          </div>
        </div>



        {/* Summary Metric Cards */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '1.5rem' }}>
          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {currentUser.role === 'employee' ? 'My Payslips' : 'Total Payslips'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
              {payslips.length}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {publishedCount} published & active
            </div>
          </Card>

          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              {currentUser.role === 'employee' ? 'My Total Net Received' : 'Total Net Disbursed'}
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#047857' }}>
              {formatCurrency(totalNet)}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              Gross total: {formatCurrency(totalGross)}
            </div>
          </Card>

          <Card style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.25rem' }}>
              Distribution Status
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--brand-blue)' }}>
              {payslips.length > 0 ? `${Math.round((publishedCount / payslips.length) * 100)}%` : '0%'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
              {payslips.filter((p) => p.status === 'viewed').length} viewed by employees
            </div>
          </Card>
        </div>

        {/* Search & Filters */}
        <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '650px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <Input
                  id="payslip-search"
                  placeholder={
                    currentUser.role === 'employee'
                      ? 'Search by payslip number or period...'
                      : 'Search by employee name, number, or payslip...'
                  }
                  value={search}
                  onChange={handleSearchChange}
                />
              </div>

              <div style={{ width: '150px' }}>
                <Select
                  id="filter-status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { label: 'All Statuses', value: 'all' },
                    { label: 'Published', value: 'published' },
                    { label: 'Viewed', value: 'viewed' },
                    { label: 'Draft', value: 'generated' },
                  ]}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing <strong>{payslips.length}</strong> payslip records
            </div>
          </div>
        </Card>

        {/* Payslips Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3.5rem 0' }}>
              <LoadingState message="Loading secure payslips..." />
            </div>
          ) : payslips.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
              <EmptyState
                title="No Payslips Found"
                description={
                  currentUser.role === 'employee'
                    ? 'There are no published payslips available for your account yet. Once payroll is approved and published by HR, your payslips will appear here.'
                    : 'No payslip records match the active criteria. Generate and approve a payroll run to distribute payslips.'
                }
              />
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Payslip Ref</TableHeaderCell>
                    {currentUser.role !== 'employee' && <TableHeaderCell>Employee</TableHeaderCell>}
                    <TableHeaderCell>Pay Period & Date</TableHeaderCell>
                    <TableHeaderCell>Gross Pay</TableHeaderCell>
                    <TableHeaderCell>Deductions</TableHeaderCell>
                    <TableHeaderCell>Net Take-Home</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell align="right">Action</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {payslips.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }} className="payslip-mono">
                          {item.payslip_number}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Run: {item.run_number}
                        </div>
                      </TableCell>

                      {currentUser.role !== 'employee' && (
                        <TableCell>
                          <div style={{ fontWeight: 600, color: '#0f172a' }}>
                            {item.employee_name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem' }}>
                            <span style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>{item.employee_number}</span>
                            <span>•</span>
                            <span>{item.department || 'General'}</span>
                          </div>
                        </TableCell>
                      )}

                      <TableCell>
                        <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#1e293b' }}>
                          {item.period_name}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          Payout: {item.payout_date}
                        </div>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-positive">
                          {formatCurrency(item.gross_pay)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-deduction">
                          -{formatCurrency(item.total_deductions)}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-net" style={{ fontSize: '0.95rem' }}>
                          {formatCurrency(item.net_pay)}
                        </span>
                      </TableCell>

                      <TableCell>
                        {getStatusBadge(item.status)}
                      </TableCell>

                      <TableCell align="right">
                        <Link href={`/payslips/${item.id}?as=${selectedUserKey}`}>
                          <Button size="sm" variant="outline" id={`btn-view-${item.id}`}>
                            View Payslip
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
