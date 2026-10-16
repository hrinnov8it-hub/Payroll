'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, WorkspaceStats, WorkspaceStat, PanelHeading } from '@/components/ui/Workspace';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
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
import { PayrollRun, PayrollRunWithItems, PayrollRunStatus } from '@/types/payroll';
import { PayrollPeriod } from '@/types/attendance';
import { getPayrollRuns, getPayrollRunById, createPayrollRun, deletePayrollRun } from '@/lib/payroll/runs-actions';
import { getPayrollPeriods } from '@/lib/attendance/actions';
import { PayrollSnapshotModal } from '@/components/payroll/PayrollSnapshotModal';

export default function PayrollRunsPage() {
  const router = useRouter();
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [runNotes, setRunNotes] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [runToDelete, setRunToDelete] = useState<PayrollRun | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [snapshotModalRun, setSnapshotModalRun] = useState<PayrollRunWithItems | null>(null);
  const [isSnapshotLoading, setIsSnapshotLoading] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [runsList, periodList] = await Promise.all([
        getPayrollRuns(),
        getPayrollPeriods(),
      ]);
      setRuns(runsList);
      setPeriods(periodList);
      if (periodList.length > 0) {
        setSelectedPeriodId(periodList[0].id);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDeleteConfirm = async () => {
    if (!runToDelete) return;
    setIsDeleting(true);
    try {
      const res = await deletePayrollRun(runToDelete.id);
      if (res.success) {
        setRunToDelete(null);
        await loadData();
      } else {
        alert(res.error || 'Failed to delete payroll run');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenSnapshot = async (run: PayrollRun) => {
    setIsSnapshotLoading(run.id);
    try {
      const fullRun = await getPayrollRunById(run.id);
      if (fullRun && fullRun.items && fullRun.items.length > 0) {
        setSnapshotModalRun(fullRun);
      } else {
        router.push(`/payroll-runs/${run.id}`);
      }
    } catch {
      router.push(`/payroll-runs/${run.id}`);
    } finally {
      setIsSnapshotLoading(null);
    }
  };

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateRun = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPeriodId) {
      setErrorMessage('Please select a payroll cutoff period.');
      return;
    }

    setCreating(true);
    setErrorMessage(null);

    try {
      const res = await createPayrollRun(selectedPeriodId, runNotes);
      if (res.success && res.data) {
        setIsCreateModalOpen(false);
        setRunNotes('');
        router.push(`/payroll-runs/${res.data.id}`);
      } else {
        setErrorMessage(res.error || 'Failed to process payroll run.');
      }
    } finally {
      setCreating(false);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    return true;
  });

  const getStatusBadgeVariant = (status: PayrollRunStatus) => {
    switch (status) {
      case 'draft':
        return 'neutral';
      case 'processing':
        return 'warning';
      case 'review':
        return 'brand';
      case 'approved':
        return 'success';
      case 'paid':
        return 'success';
      case 'locked':
        return 'danger';
      default:
        return 'neutral';
    }
  };

  const totalDisbursed = runs
    .filter((r) => r.status === 'paid')
    .reduce((sum, r) => sum + Number(r.total_net_pay || 0), 0);

  const totalInReview = runs
    .filter((r) => r.status === 'review' || r.status === 'draft')
    .reduce((sum, r) => sum + Number(r.total_net_pay || 0), 0);

  return (
    <AppShell pageTitle="Payroll runs">
      <div className="workspace-section">
        {/* Page Header */}
        <PageHeader eyebrow="PAYROLL OPERATIONS" title="Payroll runs" description="Calculate payroll, review results, and follow every run through release." actions={<>
<Button
            variant="primary"
            onClick={() => {
              setErrorMessage(null);
              setIsCreateModalOpen(true);
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: '6px' }}
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Process New Payroll Run
          </Button>
</>} />

        {/* Overview Stats */}
        <WorkspaceStats columns={3} label="Payroll run summary">
  <WorkspaceStat label="Payroll runs" value={runs.length} hint="Recorded payroll calculations" icon="document" loading={loading} />
  <WorkspaceStat label="Draft & review payroll" value={new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(totalInReview)} hint={runs.filter(run => run.status === 'review' || run.status === 'draft').length + ' runs in draft or review'} icon="clock" tone="amber" loading={loading} />
  <WorkspaceStat label="Paid payroll" value={new Intl.NumberFormat('en-PH', {style:'currency', currency:'PHP'}).format(totalDisbursed)} hint="Net payroll for runs marked paid" icon="wallet" tone="green" loading={loading} />
</WorkspaceStats>

        {/* Filters */}
        <Card className="workspace-filter-card" style={{ marginBottom: 18, padding: '18px 22px' }}>
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              alignItems: 'center',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                Filter Status:
              </span>
              <div style={{ width: '180px' }}>
                <Select
                  aria-label="Filter payroll runs by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Statuses' },
                    { value: 'draft', label: 'Draft' },
                    { value: 'processing', label: 'Processing' },
                    { value: 'review', label: 'Under Review' },
                    { value: 'approved', label: 'Approved' },
                    { value: 'paid', label: 'Paid' },
                    { value: 'locked', label: 'Locked' },
                  ]}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredRuns.length}</strong> payroll runs
            </div>
          </div>
        </Card>

        {/* Runs Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
<PanelHeading title="Run history" description="Follow each payroll from calculation to release." detail={filteredRuns.length + ' records'} />
          {loading ? (
            <div style={{ padding: '3rem 0' }}>
              <LoadingState message="Loading payroll runs..." />
            </div>
          ) : filteredRuns.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem' }}>
              <EmptyState
                title="No payroll runs found"
                description="No runs matched your criteria. Click 'Process New Payroll Run' to initiate a cycle."
              />
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Run Number</TableHeaderCell>
                    <TableHeaderCell>Payroll Period</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell>Employees</TableHeaderCell>
                    <TableHeaderCell>Gross Pay</TableHeaderCell>
                    <TableHeaderCell>Deductions</TableHeaderCell>
                    <TableHeaderCell>Net Pay</TableHeaderCell>
                    <TableHeaderCell>Processed Date</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <Link
                          href={`/payroll-runs/${run.id}`}
                          style={{
                            fontWeight: 700,
                            color: 'var(--brand-blue)',
                            fontFamily: 'monospace',
                            fontSize: '0.95rem',
                          }}
                        >
                          {run.run_number}
                        </Link>
                      </TableCell>

                      <TableCell>
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>
                            {run.payroll_period?.name || 'Cutoff Period'}
                          </div>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {run.payroll_period?.start_date} to {run.payroll_period?.end_date}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(run.status)}>
                          {run.status.toUpperCase()}
                        </Badge>
                      </TableCell>

                      <TableCell>
                        <span style={{ fontWeight: 600, fontFamily: 'monospace' }}>
                          {run.total_employees}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-positive">
                          ₱{Number(run.total_gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-deduction">
                          ₱{Number(run.total_deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span className="money-cell money-net">
                          ₱{Number(run.total_net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      </TableCell>

                      <TableCell>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {run.created_at ? new Date(run.created_at).toLocaleDateString() : '—'}
                        </span>
                      </TableCell>

                      <TableCell align="right">
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenSnapshot(run)}
                            isLoading={isSnapshotLoading === run.id}
                            title="View granular snapshot breakdown"
                          >
                            👁️ View Snapshot
                          </Button>
                          <Link href={`/payroll-runs/${run.id}`}>
                            <Button variant="outline" size="sm" title="View run details and approval chain">
                              Details
                            </Button>
                          </Link>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setRunToDelete(run)}
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            🗑️ Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* Modal: Process New Payroll Run */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Process New Payroll Run"
          size="md"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateRun}
                isLoading={creating}
              >
                Execute Calculation Engine
              </Button>
            </>
          }
        >
          <form onSubmit={handleCreateRun}>
            {errorMessage && (
              <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
                <span>{errorMessage}</span>
              </div>
            )}

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Executing this run will collect all employee Daily Time Records (DTR) for the selected cutoff, apply Philippine labor rules and company policies, and freeze immutable historical snapshots.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <Select
                label="Select Payroll Cutoff Period"
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                options={periods.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.start_date} – ${p.end_date})`,
                }))}
                required
              />
            </div>

            <div>
              <Input
                label="Run Notes / Audit Tag (Optional)"
                placeholder="e.g. Regular mid-month payroll processing"
                value={runNotes}
                onChange={(e) => setRunNotes(e.target.value)}
              />
            </div>
          </form>
        </Modal>

        {/* Modal: Confirm Delete Payroll Run */}
        <Modal
          isOpen={!!runToDelete}
          onClose={() => setRunToDelete(null)}
          title="Confirm Delete Payroll Run"
          size="sm"
          footer={
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setRunToDelete(null)}
                disabled={isDeleting}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteConfirm}
                isLoading={isDeleting}
                style={{ backgroundColor: '#dc2626', borderColor: '#dc2626' }}
              >
                Delete Payroll Run
              </Button>
            </>
          }
        >
          {runToDelete && (
            <div style={{ padding: '0.5rem 0' }}>
              <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: '#1e293b' }}>
                Are you sure you want to permanently delete payroll run <strong>{runToDelete.run_number}</strong>?
              </p>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#dc2626' }}>
                ⚠️ This will permanently remove all employee snapshots and generated payslips tied to this run.
              </p>
            </div>
          )}
        </Modal>

        {/* Modal: Payroll Snapshot Breakdown */}
        {snapshotModalRun && (
          <PayrollSnapshotModal
            isOpen={!!snapshotModalRun}
            onClose={() => setSnapshotModalRun(null)}
            items={snapshotModalRun.items || []}
            runId={snapshotModalRun.id}
          />
        )}
      </div>
    </AppShell>
  );
}
