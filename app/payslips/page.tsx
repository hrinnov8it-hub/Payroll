'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, WorkspaceStats, WorkspaceStat, WorkspaceIcon, PanelHeading } from '@/components/ui/Workspace';
import { usePortalUser } from '@/lib/auth/use-portal-user';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
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
import { getPayslips, syncPayslipsFromRun, deletePayslip } from '@/lib/payslips/actions';
import { getPayrollRuns } from '@/lib/payroll/runs-actions';
import { PayrollRun } from '@/types/payroll';

export default function PayslipsPage() {
  const authenticatedUser = usePortalUser();
  const currentUser: PayslipAccessUser = {
    id: authenticatedUser?.id || '',
    name: authenticatedUser?.fullName || authenticatedUser?.email || '',
    email: authenticatedUser?.email || '',
    role: authenticatedUser?.role === 'super_admin' ? 'admin' : (authenticatedUser?.role || 'employee'),
  };

  const [payslips, setPayslips] = useState<Payslip[]>([]);
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [periodFilter, setPeriodFilter] = useState<string>('all');

  const handleSyncAllPayslips = async () => {
    if (!authenticatedUser || currentUser.role === 'employee') return;
    setSyncing(true);
    try {
      const runsList = await getPayrollRuns();
      for (const r of runsList) {
        await syncPayslipsFromRun(r.id);
      }
      await loadData(currentUser);
    } catch (err) {
      console.error('Error syncing payslips:', err);
    } finally {
      setSyncing(false);
    }
  };

  const handleDeletePayslip = async (payslip: Payslip) => {
    if (!confirm(`Are you sure you want to delete payslip ${payslip.payslip_number} for ${payslip.employee_name}?`)) {
      return;
    }
    try {
      const res = await deletePayslip(payslip.id);
      if (res.success) {
        setPayslips((prev) => prev.filter((p) => p.id !== payslip.id));
      } else {
        alert(res.error || 'Failed to delete payslip');
      }
    } catch {
      alert('Failed to delete payslip');
    }
  };

  const loadData = async (user: PayslipAccessUser) => {
    setLoading(true);
    try {
      // Sync any approved/paid runs if available
      const runsList = user.role === 'employee' ? [] : await getPayrollRuns();
      setRuns(runsList);

      // Sync all payroll runs to ensure generated/published payslips exist
      for (const r of runsList) {
        await syncPayslipsFromRun(r.id);
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
    if (authenticatedUser) void loadData(currentUser);
  }, [authenticatedUser?.id, authenticatedUser?.role, statusFilter, periodFilter]);

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
    <AppShell pageTitle="Payslips">
      <div className="dashboard-container" style={{ paddingBottom: '3rem' }}>
        {/* Header Area */}
        <PageHeader eyebrow="PAYROLL DOCUMENTS" title="Payslips" description={currentUser.role === 'employee' ? 'Your personal payslips and payroll documents.' : 'Review employee payslips, distribution status, and payroll documents.'} actions={<>
{authenticatedUser && currentUser.role !== 'employee' && <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSyncAllPayslips}
              isLoading={syncing}
            >
              <WorkspaceIcon name="document" size={16} /> Regenerate payslips
            </Button>
            <ButtonLink href="/payroll-runs" variant="outline" size="sm">
              View Payroll Runs
            </ButtonLink>
          </div>}
</>} />



        {/* Summary Metric Cards */}
        <WorkspaceStats columns={3} label="Payslip summary">
  <WorkspaceStat label={currentUser.role === 'employee' ? 'My payslips' : 'Payslip records'} value={payslips.length} hint={publishedCount + ' published or viewed'} icon="document" loading={loading} />
  <WorkspaceStat label="Net pay in this view" value={formatCurrency(totalNet)} hint={'Gross pay: ' + formatCurrency(totalGross)} icon="wallet" tone="blue" loading={loading} />
  <WorkspaceStat label="Published or viewed" value={(payslips.length > 0 ? Math.round(publishedCount / payslips.length * 100) : 0) + '%'} hint={payslips.filter(p => p.status === 'viewed').length + ' viewed by employees'} icon="check" tone="green" loading={loading} />
</WorkspaceStats>

        {/* Search & Filters */}
        <Card className="workspace-filter-card" style={{ marginBottom: 18, padding: '18px 22px' }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flex: 1, minWidth: '280px', maxWidth: '650px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px' }}>
                <Input
                  id="payslip-search"
                  aria-label="Search payslips"
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
                  aria-label="Filter payslips by status"
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
<PanelHeading title="Payslip records" description="Payroll documents and their distribution status." detail={payslips.length + ' records'} />
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
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <ButtonLink href={`/payslips/${item.id}`} size="sm" variant="outline" id={`btn-view-${item.id}`}>
                            View Payslip
                          </ButtonLink>
                          {currentUser.role !== 'employee' && (
                            <Button
                              size="sm"
                              variant="danger-outline"
                              onClick={() => handleDeletePayslip(item)}
                              leftIcon={<WorkspaceIcon name="trash" size={16} />}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
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
