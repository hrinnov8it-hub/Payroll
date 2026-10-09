'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from '@/components/ui/ErrorState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';
import { PayrollRun, PayrollRunStatus } from '@/types/payroll';
import { PayrollPeriod } from '@/types/attendance';
import { Employee } from '@/types/employee';
import { getPayrollRuns, createPayrollRun } from '@/lib/payroll/runs-actions';
import { getPayrollPeriods } from '@/lib/attendance/actions';
import { getEmployees } from '@/lib/employees/actions';

export default function DashboardPage() {
  const router = useRouter();

  // Data state
  const [runs, setRuns] = useState<PayrollRun[]>([]);
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal & calculation state
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [runNotes, setRunNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const [runsData, periodsData, employeesData] = await Promise.all([
        getPayrollRuns(),
        getPayrollPeriods(),
        getEmployees(),
      ]);

      setRuns(runsData);
      setPeriods(periodsData);
      setEmployees(employeesData);

      if (periodsData.length > 0) {
        setSelectedPeriodId(periodsData[0].id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleStartCalculation = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedPeriodId) {
      setCalculationError('Please select a payroll cutoff period.');
      return;
    }

    setIsCalculating(true);
    setCalculationError(null);

    try {
      const res = await createPayrollRun(selectedPeriodId, runNotes);
      if (res.success && res.data) {
        setIsNewRunModalOpen(false);
        setRunNotes('');
        router.push(`/payroll-runs/${res.data.id}`);
      } else {
        setCalculationError(res.error || 'Failed to process payroll run.');
      }
    } catch (err: any) {
      setCalculationError(err?.message || 'An unexpected error occurred during calculation.');
    } finally {
      setIsCalculating(false);
    }
  };

  const getStatusBadge = (status: PayrollRunStatus) => {
    switch (status) {
      case 'draft':
        return <Badge variant="warning" dot>Draft In Progress</Badge>;
      case 'processing':
        return <Badge variant="warning" dot>Processing</Badge>;
      case 'review':
        return <Badge variant="info" dot>Under Review</Badge>;
      case 'approved':
        return <Badge variant="brand" dot>Approved</Badge>;
      case 'paid':
        return <Badge variant="success" dot>Disbursed & Paid</Badge>;
      case 'locked':
        return <Badge variant="danger" dot>Locked</Badge>;
      default:
        return <Badge variant="neutral" dot>{status}</Badge>;
    }
  };

  const activeEmployeesCount = employees.filter((e) => e.status === 'active').length;
  const latestRun = runs[0];
  const latestNetDisbursal = latestRun ? Number(latestRun.total_net_pay || 0) : 0;
  const activePeriod = periods.find((p) => p.status === 'open') || periods[0];

  return (
    <AppShell pageTitle="Payroll Dashboard">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Payroll Operations Overview</h1>
          <p>Innov8IT Corporation — Philippine Payroll Management & Disbursals</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/reports" style={{ textDecoration: 'none' }}>
            <Button variant="outline" size="sm">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Export Reports
            </Button>
          </Link>
          <Button variant="primary" size="sm" onClick={() => setIsNewRunModalOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="16" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Process New Payroll
          </Button>
        </div>
      </div>

      {/* Primary KPI Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Active Headcount</span>
            <div className="stat-icon stat-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
          </div>
          <div className="stat-value">{activeEmployeesCount}</div>
          <div className="stat-subtext">
            <Badge variant="success" dot>{activeEmployeesCount > 0 ? 'Active Staff' : 'No Staff'}</Badge>
            <span>{employees.length} Total Registered</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Active Pay Cutoff</span>
            <div className="stat-icon stat-icon-dark">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" x2="16" y1="2" y2="6" />
                <line x1="8" x2="8" y1="2" y2="6" />
                <line x1="3" x2="21" y1="10" y2="10" />
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.2rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {activePeriod?.name || '—'}
          </div>
          <div className="stat-subtext">
            <Badge variant={activePeriod ? 'brand' : 'info'}>{activePeriod ? 'Active Period' : 'Not Set'}</Badge>
            <span>{activePeriod ? `${activePeriod.start_date} to ${activePeriod.end_date}` : 'No active cycle'}</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Latest Net Disbursal</span>
            <div className="stat-icon stat-icon-accent">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value number-mono">
            ₱{latestNetDisbursal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--text-muted)' }}>
              {latestRun ? `Run: ${latestRun.run_number}` : 'No payroll runs computed yet'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Statutory Compliance</span>
            <div className="stat-icon stat-icon-blue">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
          </div>
          <div className="stat-value" style={{ fontSize: '1.45rem' }}>SSS • PHIC • HDMF</div>
          <div className="stat-subtext">
            <Badge variant="success" dot>BIR Rates Updated</Badge>
            <span>PH Statutory Tables</span>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div className="dashboard-content-grid">
        {/* Recent Payroll Runs Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Payroll History & Active Runs</CardTitle>
              <CardSubtitle>Recent cutoff calculations, gross pay, statutory deductions, and net payout totals</CardSubtitle>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Badge variant="brand-dark">{runs.length} Runs Recorded</Badge>
              <Link href="/payroll-runs" style={{ textDecoration: 'none' }}>
                <Button variant="ghost" size="xs">View All</Button>
              </Link>
            </div>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            {loading ? (
              <div style={{ padding: '3rem 0' }}>
                <LoadingState message="Loading payroll records..." />
              </div>
            ) : runs.length === 0 ? (
              <div style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.9rem',
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <p style={{ margin: 0, fontWeight: 600 }}>No payroll runs yet</p>
                <p style={{ margin: '0.25rem 0 0' }}>Click <strong>Process New Payroll</strong> to calculate your first run.</p>
              </div>
            ) : (
              <TableContainer style={{ border: 'none' }}>
                <Table hoverable>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>Run Number</TableHeaderCell>
                      <TableHeaderCell>Headcount</TableHeaderCell>
                      <TableHeaderCell>Gross Pay</TableHeaderCell>
                      <TableHeaderCell>Deductions</TableHeaderCell>
                      <TableHeaderCell>Net Payout</TableHeaderCell>
                      <TableHeaderCell>Status</TableHeaderCell>
                      <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {runs.slice(0, 6).map((run) => (
                      <TableRow key={run.id}>
                        <TableCell>
                          <strong>{run.run_number}</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                            {run.payroll_period?.name || 'Standard Cutoff'}
                          </div>
                        </TableCell>
                        <TableCell>{run.total_employees} Staff</TableCell>
                        <TableCell className="number-mono" style={{ fontWeight: 600 }}>
                          ₱{Number(run.total_gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="number-mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                          -₱{Number(run.total_deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="number-mono" style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }}>
                          ₱{Number(run.total_net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>{getStatusBadge(run.status)}</TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', gap: '6px' }}>
                            <Link href={`/payroll-runs/${run.id}`}>
                              <Button variant="outline" size="xs">
                                View Run
                              </Button>
                            </Link>
                            <Link href={`/payslips?runId=${run.id}`}>
                              <Button variant="ghost" size="xs">
                                Payslips
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </CardBody>
          <CardFooter>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing {Math.min(runs.length, 6)} of {runs.length} recorded payroll runs.
            </span>
          </CardFooter>
        </Card>

        {/* Quick Operations & Statutory Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Quick Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Payroll Management Modules</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="quick-actions-grid">
                <Link href="/employees" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="quick-action-item">
                    <div className="quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <span className="quick-action-label">Employees</span>
                    <span className="quick-action-count">{employees.length} Active</span>
                  </div>
                </Link>

                <Link href="/attendance" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="quick-action-item">
                    <div className="quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="10" />
                        <polyline points="12 6 12 12 16 14" />
                      </svg>
                    </div>
                    <span className="quick-action-label">Attendance & DTR</span>
                    <span className="quick-action-count">DTR Logs</span>
                  </div>
                </Link>

                <Link href="/payroll-runs" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="quick-action-item">
                    <div className="quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect width="20" height="14" x="2" y="5" rx="2" />
                        <line x1="2" x2="22" y1="10" y2="10" />
                      </svg>
                    </div>
                    <span className="quick-action-label">Payroll Runs</span>
                    <span className="quick-action-count">{runs.length} Total</span>
                  </div>
                </Link>

                <Link href="/payslips" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div className="quick-action-item">
                    <div className="quick-action-icon">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                      </svg>
                    </div>
                    <span className="quick-action-label">Payslips</span>
                    <span className="quick-action-count">PDF & Email</span>
                  </div>
                </Link>
              </div>
            </CardBody>
          </Card>

          {/* Compliance Card */}
          <Card>
            <CardHeader>
              <CardTitle>Statutory Rules Summary</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>SSS Rate (2025/2026)</span>
                  <Badge variant="brand" size="sm">9.5% ER / 4.5% EE</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>PhilHealth Contribution</span>
                  <Badge variant="brand" size="sm">5.0% Total (2.5% EE)</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Pag-IBIG Fund (HDMF)</span>
                  <Badge variant="brand" size="sm">₱200 Regular Cap</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>BIR Withholding Tax</span>
                  <Badge variant="success" size="sm">TRAIN Law Revised</Badge>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Modal: Process & Compute New Payroll Run */}
      <Modal
        isOpen={isNewRunModalOpen}
        onClose={() => {
          if (!isCalculating) {
            setIsNewRunModalOpen(false);
            setCalculationError(null);
          }
        }}
        title="Process New Payroll Run"
        subtitle="Select cutoff period and processing parameters for this calculation"
        size="md"
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsNewRunModalOpen(false);
                setCalculationError(null);
              }}
              disabled={isCalculating}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleStartCalculation()}
              isLoading={isCalculating}
              disabled={isCalculating}
            >
              {isCalculating ? 'Calculating Payroll...' : 'Start Calculation'}
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {calculationError && (
            <AlertBanner
              variant="danger"
              title="Calculation Error"
              message={calculationError}
              onClose={() => setCalculationError(null)}
            />
          )}

          <Select
            label="Payroll Cutoff Period"
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            options={
              periods.length > 0
                ? periods.map((p) => ({
                    value: p.id,
                    label: `${p.name} (${p.start_date} to ${p.end_date})`,
                  }))
                : [
                    { value: '', label: '— No periods found —' },
                    { value: 'period-2026-09-b', label: 'September 16 – 30, 2026' },
                    { value: 'period-2026-09-a', label: 'September 1 – 15, 2026' },
                  ]
            }
            helperText="The start and end dates for time logs and attendance calculation"
            disabled={isCalculating}
          />

          <Input
            label="Run Notes / Reference (Optional)"
            placeholder="e.g. Regular 2nd Half September Run with Mid-Month Adjustments"
            value={runNotes}
            onChange={(e) => setRunNotes(e.target.value)}
            disabled={isCalculating}
          />

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <strong>Payroll Run Highlights:</strong>
            <ul style={{ margin: '6px 0 0 18px', color: 'var(--text-muted)' }}>
              <li>Processes all {activeEmployeesCount} active employees from the roster</li>
              <li>Calculates statutory contributions (SSS, PhilHealth, Pag-IBIG)</li>
              <li>Computes BIR progressive withholding tax based on taxable income</li>
              <li>Computes overtime hours, night differentials, and holiday rates</li>
            </ul>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
