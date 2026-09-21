'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
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
import { PayrollRun, PayrollRunStatus } from '@/types/payroll';
import { PayrollPeriod } from '@/types/attendance';
import { getPayrollRuns, createPayrollRun } from '@/lib/payroll/runs-actions';
import { getPayrollPeriods } from '@/lib/attendance/actions';

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
    <AppShell>
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Page Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexWrap: 'wrap',
            gap: '1rem',
            marginBottom: '1.5rem',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <h1 style={{ margin: 0, color: 'var(--brand-dark-blue)', fontSize: '1.75rem', fontWeight: 800 }}>
                Payroll Runs
              </h1>
              
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Create, process, recalculate, and track historical payroll calculation snapshots.
            </p>
          </div>

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
        </div>

        {/* Overview Stats */}
        <div className="attendance-summary-cards">
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Payroll Runs</span>
            <span className="attendance-metric-value">{runs.length}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Historical payroll cycles recorded
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Pending Review / Draft</span>
            <span className="attendance-metric-value" style={{ color: 'var(--brand-blue)' }}>
              ₱{totalInReview.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {runs.filter((r) => r.status === 'review' || r.status === 'draft').length} active run(s)
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Disbursed (Paid)</span>
            <span className="attendance-metric-value" style={{ color: 'var(--success)' }}>
              ₱{totalDisbursed.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Closed & released payrolls
            </span>
          </div>
        </div>

        {/* Filters */}
        <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
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
                        <Link href={`/payroll-runs/${run.id}`}>
                          <Button variant="outline" size="sm">
                            View Snapshots
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
      </div>
    </AppShell>
  );
}
