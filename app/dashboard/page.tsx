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
import { Skeleton, Spinner, TableSkeleton } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { AlertBanner } from '@/components/ui/ErrorState';
import { Logo, LogoIcon } from '@/components/ui/Logo';

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'design-system'>('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sampleInput, setSampleInput] = useState('');
  const [sampleSelect, setSampleSelect] = useState('monthly');
  const [showAlert, setShowAlert] = useState(true);

  return (
    <AppShell pageTitle="Executive Dashboard">
      {/* Header with Tab Navigation */}
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <h1>Innov8IT Payroll Management</h1>
          <p>Phase 2 Design System & Component Library Verification</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ display: 'inline-flex', padding: '3px', background: '#e2e8f0', borderRadius: 'var(--radius-md)' }}>
            <button
              className={`btn btn-xs ${activeTab === 'overview' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('overview')}
            >
              Overview Shell
            </button>
            <button
              className={`btn btn-xs ${activeTab === 'design-system' ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setActiveTab('design-system')}
            >
              Design System Showcase
            </button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 3h6v6" />
              <path d="M10 14 21 3" />
              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            </svg>
            Preview Modal
          </Button>
        </div>
      </div>

      {showAlert && (
        <AlertBanner
          variant="info"
          title="Phase 2 Completed"
          message="Approved Innov8IT colors (#399ca2, #034697, #e2a025), typography (Montserrat, Syne, Work Sans), vector logo, and all reusable UI components are active."
          onClose={() => setShowAlert(false)}
        />
      )}

      {activeTab === 'overview' ? (
        <>
          {/* KPI Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Total Active Staff</span>
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
                <Badge variant="success" dot>Active Roster</Badge>
                <span>4 Departments</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Current Pay Period</span>
                <div className="stat-icon stat-icon-dark">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" x2="16" y1="2" y2="6" />
                    <line x1="8" x2="8" y1="2" y2="6" />
                    <line x1="3" x2="21" y1="10" y2="10" />
                  </svg>
                </div>
              </div>
              <div className="stat-value" style={{ fontSize: '1.4rem' }}>Sep 1 - 15, 2026</div>
              <div className="stat-subtext">
                <Badge variant="brand">Semi-Monthly</Badge>
                <span>Cycle 1</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Est. Disbursal</span>
                <div className="stat-icon stat-icon-accent">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="12" x2="12" y1="2" y2="22" />
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">₱684,250.00</div>
              <div className="stat-subtext">
                <span style={{ color: 'var(--brand-accent)', fontWeight: 700 }}>Disbursal:</span>
                <span>Sep 15, 2026</span>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-card-top">
                <span className="stat-label">Visual Design</span>
                <div className="stat-icon stat-icon-blue">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                  </svg>
                </div>
              </div>
              <div className="stat-value">Phase 2</div>
              <div className="stat-subtext">
                <Badge variant="brand-accent" dot>Design System Ready</Badge>
              </div>
            </div>
          </div>

          {/* Activity Table Shell */}
          <div className="dashboard-content-grid">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Payroll History Ledger (Snapshot Shell)</CardTitle>
                  <CardSubtitle>Historical record registers formatted with Innov8IT typography</CardSubtitle>
                </div>
                <Badge variant="brand-dark">Preserved Snapshots</Badge>
              </CardHeader>
              <CardBody style={{ padding: 0 }}>
                <TableContainer style={{ border: 'none' }}>
                  <Table hoverable>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>Payroll Period</TableHeaderCell>
                        <TableHeaderCell>Headcount</TableHeaderCell>
                        <TableHeaderCell>Gross Amount</TableHeaderCell>
                        <TableHeaderCell>Status</TableHeaderCell>
                        <TableHeaderCell style={{ textAlign: 'right' }}>Action</TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <TableRow>
                        <TableCell>
                          <strong>Sep 1 - 15, 2026</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>First Half September</div>
                        </TableCell>
                        <TableCell>24 Employees</TableCell>
                        <TableCell className="number-mono" style={{ fontWeight: 600 }}>₱684,250.00</TableCell>
                        <TableCell>
                          <Badge variant="warning" dot>Draft</Badge>
                        </TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <Button variant="outline" size="xs" onClick={() => setIsModalOpen(true)}>
                            Details
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <strong>Aug 16 - 31, 2026</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Second Half August</div>
                        </TableCell>
                        <TableCell>24 Employees</TableCell>
                        <TableCell className="number-mono" style={{ fontWeight: 600 }}>₱679,120.00</TableCell>
                        <TableCell>
                          <Badge variant="success" dot>Locked & Paid</Badge>
                        </TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <Button variant="ghost" size="xs">
                            Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>
                          <strong>Aug 1 - 15, 2026</strong>
                          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>First Half August</div>
                        </TableCell>
                        <TableCell>23 Employees</TableCell>
                        <TableCell className="number-mono" style={{ fontWeight: 600 }}>₱652,800.00</TableCell>
                        <TableCell>
                          <Badge variant="success" dot>Locked & Paid</Badge>
                        </TableCell>
                        <TableCell style={{ textAlign: 'right' }}>
                          <Button variant="ghost" size="xs">
                            Ledger
                          </Button>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardBody>
              <CardFooter>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Demonstrating responsive Plain CSS tables with hover rows and badges
                </span>
              </CardFooter>
            </Card>

            {/* Quick Actions & Brand Verification */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <Card>
                <CardHeader>
                  <CardTitle>Branding Summary</CardTitle>
                </CardHeader>
                <CardBody>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <LogoIcon size={38} />
                      <div>
                        <div style={{ fontFamily: 'var(--font-header)', fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                          Innov8<span style={{ color: 'var(--brand-blue)' }}>IT</span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-subheader)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Approved Brand Emblem
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <div style={{ flex: 1, height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: '#399ca2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                        #399ca2
                      </div>
                      <div style={{ flex: 1, height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: '#034697', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>
                        #034697
                      </div>
                      <div style={{ flex: 1, height: '32px', borderRadius: 'var(--radius-sm)', backgroundColor: '#e2a025', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#111', fontSize: '0.7rem', fontWeight: 700 }}>
                        #e2a025
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                      <strong>Typography:</strong><br />
                      • Headers: <em>Montserrat</em><br />
                      • Subheaders: <em>Syne</em><br />
                      • Body/Text: <em>Work Sans</em>
                    </div>
                  </div>
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardBody>
                  <div className="quick-actions-grid">
                    <Link href="/(auth)/login" className="quick-action-item">
                      <div className="quick-action-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                          <polyline points="10 17 15 12 10 7" />
                          <line x1="15" x2="3" y1="12" y2="12" />
                        </svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>Branded Login Screen</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Inspect login branding</div>
                      </div>
                    </Link>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </>
      ) : (
        /* Design System Showcase View */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Section 1: Typography & Logos */}
          <Card>
            <CardHeader>
              <CardTitle>1. Typography & Brand Mark</CardTitle>
              <Badge variant="brand">Montserrat • Syne • Work Sans</Badge>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Official Logo Variants</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <Logo size="lg" theme="light" />
                    <div style={{ background: '#02244f', padding: '1rem', borderRadius: 'var(--radius-md)', display: 'inline-flex' }}>
                      <Logo size="md" theme="dark" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                      <LogoIcon size={44} />
                      <LogoIcon size={34} />
                      <LogoIcon size={26} />
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Scalable Vector Marks</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Typography Hierarchy</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <h1>Header 1 (Montserrat 800)</h1>
                    <h2>Header 2 (Montserrat 700)</h2>
                    <h4>Subheader 4 (Syne 600)</h4>
                    <p style={{ color: 'var(--text-main)' }}>
                      Body copy rendered with <strong>Work Sans</strong>: Crisp, readable, and perfectly balanced for modern corporate HR and payroll administration.
                    </p>
                    <code className="number-mono" style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: '4px', width: 'fit-content' }}>
                      ₱1,450,280.00 — Monospaced Financial Figures
                    </code>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 2: Buttons & Badges */}
          <Card>
            <CardHeader>
              <CardTitle>2. Button & Badge Primitives</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Button Variants</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Button variant="primary">Primary Blue</Button>
                    <Button variant="dark">Dark Blue</Button>
                    <Button variant="accent">Accent Gold</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="primary" isLoading>Loading</Button>
                    <Button variant="primary" disabled>Disabled</Button>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Button Sizes</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button variant="primary" size="xs">Extra Small (xs)</Button>
                    <Button variant="primary" size="sm">Small (sm)</Button>
                    <Button variant="primary" size="md">Medium (md)</Button>
                    <Button variant="primary" size="lg">Large (lg)</Button>
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-muted)' }}>Badge Variants & Dot Indicators</h4>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <Badge variant="brand" dot>Innov8IT Blue</Badge>
                    <Badge variant="brand-dark" dot>Dark Blue</Badge>
                    <Badge variant="brand-accent" dot>Accent Gold</Badge>
                    <Badge variant="success" dot>Approved</Badge>
                    <Badge variant="warning" dot>Under Review</Badge>
                    <Badge variant="danger" dot>Terminated</Badge>
                    <Badge variant="info" dot>Processing</Badge>
                    <Badge variant="neutral">Neutral Tag</Badge>
                    <Badge variant="brand" size="sm">Small Badge</Badge>
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Section 3: Form Controls */}
          <Card>
            <CardHeader>
              <CardTitle>3. Inputs & Form Controls</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
                <Input
                  label="Employee Full Name"
                  placeholder="e.g. Maria Santos"
                  value={sampleInput}
                  onChange={(e) => setSampleInput(e.target.value)}
                  helperText="Enter employee's official government registered name"
                  required
                />

                <Select
                  label="Compensation Pay Type"
                  value={sampleSelect}
                  onChange={(e) => setSampleSelect(e.target.value)}
                  options={[
                    { value: 'monthly', label: 'Monthly Fixed Salary' },
                    { value: 'daily', label: 'Daily Rate Basis' },
                    { value: 'hourly', label: 'Hourly Rate Basis' },
                  ]}
                  helperText="Determines statutory deduction computation method"
                />

                <Input
                  label="TIN Number (Tax Identification)"
                  placeholder="000-000-000-000"
                  error="Sample validation error state preview"
                />
              </div>
            </CardBody>
          </Card>

          {/* Section 4: Loading & Feedback States */}
          <Card>
            <CardHeader>
              <CardTitle>4. Loading & Empty State Components</CardTitle>
            </CardHeader>
            <CardBody>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Skeleton Loaders & Spinners</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <Spinner size="sm" />
                      <Spinner size="md" />
                      <Spinner size="lg" />
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Animated SVG Spinners</span>
                    </div>
                    <TableSkeleton rows={3} cols={3} />
                  </div>
                </div>

                <div>
                  <h4 style={{ marginBottom: '1rem', color: 'var(--text-muted)' }}>Empty State Card</h4>
                  <EmptyState
                    title="No Unprocessed Deductions"
                    description="All employee loans and statutory contributions are up to date for this pay cutoff."
                    actionText="View Deduction Ledger"
                    onAction={() => alert('Empty state action triggered')}
                  />
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* Interactive Phase 2 Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Innov8IT Design System Modal"
        subtitle="Accessible dialog primitive with backdrop blur and keyboard escape listener"
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Close Window
            </Button>
            <Button variant="primary" size="sm" onClick={() => setIsModalOpen(false)}>
              Confirm Action
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ color: 'var(--text-main)', fontSize: '0.92rem', lineHeight: 1.5 }}>
            This modal primitive is built using <strong>100% Plain CSS</strong> with no external UI component libraries. It supports animated sliding transitions, backdrop blur, Escape key dismissal, and custom action footers.
          </p>

          <Input
            label="Sample Modal Field"
            placeholder="Type anything here..."
            helperText="Modal maintains focus and traps interaction safely"
          />

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Badge variant="success" dot>Design System Ready</Badge>
            <Badge variant="brand">Responsive</Badge>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
