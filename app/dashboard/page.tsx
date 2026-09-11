'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableHeaderCell, TableRow } from '@/components/ui/Table';

interface PayrollSummary {
  id: string;
  period: string;
  cycle: string;
  headcount: number;
  grossPay: string;
  deductions: string;
  netPay: string;
  status: 'draft' | 'review' | 'approved' | 'disbursed';
  payoutDate: string;
}

const mockPayrollRuns: PayrollSummary[] = [
  {
    id: 'PR-2026-09A',
    period: 'Sep 1 – 15, 2026',
    cycle: '1st Half (15th)',
    headcount: 24,
    grossPay: '₱786,450.00',
    deductions: '₱102,200.00',
    netPay: '₱684,250.00',
    status: 'draft',
    payoutDate: 'Sep 15, 2026',
  },
  {
    id: 'PR-2026-08B',
    period: 'Aug 16 – 31, 2026',
    cycle: '2nd Half (End-month)',
    headcount: 24,
    grossPay: '₱780,100.00',
    deductions: '₱100,980.00',
    netPay: '₱679,120.00',
    status: 'disbursed',
    payoutDate: 'Aug 31, 2026',
  },
  {
    id: 'PR-2026-08A',
    period: 'Aug 1 – 15, 2026',
    cycle: '1st Half (15th)',
    headcount: 23,
    grossPay: '₱750,500.00',
    deductions: '₱97,700.00',
    netPay: '₱652,800.00',
    status: 'disbursed',
    payoutDate: 'Aug 15, 2026',
  },
  {
    id: 'PR-2026-07B',
    period: 'Jul 16 – 31, 2026',
    cycle: '2nd Half (End-month)',
    headcount: 23,
    grossPay: '₱748,900.00',
    deductions: '₱96,400.00',
    netPay: '₱652,500.00',
    status: 'disbursed',
    payoutDate: 'Jul 31, 2026',
  },
];

export default function DashboardPage() {
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [newRunPeriod, setNewRunPeriod] = useState('2026-09-16-to-30');
  const [newRunCycle, setNewRunCycle] = useState('semi-monthly');

  const getStatusBadge = (status: PayrollSummary['status']) => {
    switch (status) {
      case 'draft':
        return <Badge variant="warning" dot>Draft In Progress</Badge>;
      case 'review':
        return <Badge variant="info" dot>Under Review</Badge>;
      case 'approved':
        return <Badge variant="brand" dot>Approved</Badge>;
      case 'disbursed':
        return <Badge variant="success" dot>Disbursed & Paid</Badge>;
    }
  };

  return (
    <AppShell pageTitle="Payroll Dashboard">
      {/* Header Bar */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Payroll Operations Overview</h1>
          <p>Innov8IT Corporation — Philippine Payroll Management & Disbursals</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Button variant="outline" size="sm">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Reports
          </Button>
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
          <div className="stat-value">24</div>
          <div className="stat-subtext">
            <Badge variant="success" dot>100% Active</Badge>
            <span>4 Teams / Depts</span>
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
          <div className="stat-value" style={{ fontSize: '1.45rem' }}>Sep 1 – 15, 2026</div>
          <div className="stat-subtext">
            <Badge variant="brand">Semi-Monthly</Badge>
            <span>Cutoff 1</span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-top">
            <span className="stat-label">Est. Net Disbursal</span>
            <div className="stat-icon stat-icon-accent">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="2" x2="12" y2="22" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="stat-value number-mono">₱684,250.00</div>
          <div className="stat-subtext">
            <span style={{ color: 'var(--brand-accent)', fontWeight: 700 }}>Payout Date:</span>
            <span>Sep 15, 2026</span>
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
            <span>PH Tables</span>
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
              <CardSubtitle>Recent semi-monthly cutoff periods, gross amounts, and net payout totals</CardSubtitle>
            </div>
            <Badge variant="brand-dark">4 Cutoffs Recorded</Badge>
          </CardHeader>
          <CardBody style={{ padding: 0 }}>
            <TableContainer style={{ border: 'none' }}>
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Cutoff Period</TableHeaderCell>
                    <TableHeaderCell>Headcount</TableHeaderCell>
                    <TableHeaderCell>Gross Pay</TableHeaderCell>
                    <TableHeaderCell>Deductions</TableHeaderCell>
                    <TableHeaderCell>Net Payout</TableHeaderCell>
                    <TableHeaderCell>Status</TableHeaderCell>
                    <TableHeaderCell style={{ textAlign: 'right' }}>Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {mockPayrollRuns.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell>
                        <strong>{run.period}</strong>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                          {run.cycle} • Payout: {run.payoutDate}
                        </div>
                      </TableCell>
                      <TableCell>{run.headcount} Staff</TableCell>
                      <TableCell className="number-mono" style={{ fontWeight: 600 }}>
                        {run.grossPay}
                      </TableCell>
                      <TableCell className="number-mono" style={{ color: 'var(--danger)', fontWeight: 600 }}>
                        -{run.deductions}
                      </TableCell>
                      <TableCell className="number-mono" style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }}>
                        {run.netPay}
                      </TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <Button variant="outline" size="xs">
                            View Run
                          </Button>
                          <Button variant="ghost" size="xs">
                            Payslips
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardBody>
          <CardFooter>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Showing the latest completed and in-progress payroll runs.
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
                <div className="quick-action-item">
                  <div className="quick-action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Employee Roster</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>24 Employees • Rates & Info</div>
                  </div>
                </div>

                <div className="quick-action-item">
                  <div className="quick-action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Attendance & DTR</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Timesheets, Overtime, Leaves</div>
                  </div>
                </div>

                <div className="quick-action-item">
                  <div className="quick-action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="12" y1="2" x2="12" y2="22" />
                      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Payroll Processing</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Calculation, Review & Approval</div>
                  </div>
                </div>

                <div className="quick-action-item">
                  <div className="quick-action-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" x2="8" y1="13" y2="13" />
                      <line x1="16" x2="8" y1="17" y2="17" />
                    </svg>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Employee Payslips</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>PDF Generation & Distribution</div>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Statutory Deductions Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Statutory Deductions Reference</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Social Security System (SSS)</span>
                  <Badge variant="brand" size="sm">2026 Schedule</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ color: 'var(--text-muted)' }}>PhilHealth (PHIC)</span>
                  <Badge variant="brand" size="sm">5.0% Premium</Badge>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)' }}>
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

      {/* Modal: Start New Payroll Run */}
      <Modal
        isOpen={isNewRunModalOpen}
        onClose={() => setIsNewRunModalOpen(false)}
        title="Process New Payroll Run"
        subtitle="Select cutoff period and processing parameters for this calculation"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsNewRunModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                alert('Payroll run initialization triggered!');
                setIsNewRunModalOpen(false);
              }}
            >
              Start Calculation
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <Select
            label="Payroll Cutoff Period"
            value={newRunPeriod}
            onChange={(e) => setNewRunPeriod(e.target.value)}
            options={[
              { value: '2026-09-16-to-30', label: 'September 16 – 30, 2026 (Upcoming)' },
              { value: '2026-09-01-to-15', label: 'September 1 – 15, 2026 (Current Draft)' },
              { value: '2026-10-01-to-15', label: 'October 1 – 15, 2026' },
            ]}
            helperText="The start and end dates for time logs and attendance calculation"
          />

          <Select
            label="Pay Frequency Cycle"
            value={newRunCycle}
            onChange={(e) => setNewRunCycle(e.target.value)}
            options={[
              { value: 'semi-monthly', label: 'Semi-Monthly (15th / 30th)' },
              { value: 'monthly', label: 'Monthly' },
              { value: 'weekly', label: 'Weekly' },
            ]}
          />

          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', fontSize: '0.85rem' }}>
            <strong>Payroll Run Highlights:</strong>
            <ul style={{ margin: '6px 0 0 18px', color: 'var(--text-muted)' }}>
              <li>Includes 24 active employees from all departments</li>
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
