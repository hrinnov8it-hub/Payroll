'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeWithRelations, EmployeeStatus } from '@/types/employee';
import { getEmployeeById, updateEmployee } from '@/lib/employees/actions';

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;
      setLoading(true);
      try {
        const emp = await getEmployeeById(id);
        setEmployee(emp);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleToggleStatus = async () => {
    if (!employee) return;
    const newStatus: EmployeeStatus = employee.status === 'active' ? 'inactive' : 'active';
    setUpdatingStatus(true);
    try {
      const res = await updateEmployee(employee.id, { status: newStatus });
      if (res.success && res.data) {
        setEmployee(res.data);
      }
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Employee Profile">
        <div style={{ padding: '4rem 1rem' }}>
          <LoadingState title="Loading Profile" message="Retrieving employee master record and compensation structure..." />
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell pageTitle="Employee Not Found">
        <EmptyState
          title="Employee Profile Not Found"
          description={`No employee record exists for ID "${id}". It may have been deleted or the link is invalid.`}
          actionText="Back to Employee Directory"
          onAction={() => router.push('/employees')}
        />
      </AppShell>
    );
  }

  const initials = `${employee.first_name[0] || ''}${employee.last_name[0] || ''}`.toUpperCase();

  // Calculate length of tenure
  const hireDateObj = new Date(employee.hire_date);
  const now = new Date();
  const diffMonths = (now.getFullYear() - hireDateObj.getFullYear()) * 12 + (now.getMonth() - hireDateObj.getMonth());
  const tenureYears = Math.floor(diffMonths / 12);
  const tenureRemainingMonths = diffMonths % 12;
  const tenureStr =
    tenureYears > 0
      ? `${tenureYears} yr${tenureYears > 1 ? 's' : ''} ${tenureRemainingMonths} mo${tenureRemainingMonths !== 1 ? 's' : ''}`
      : `${diffMonths} month${diffMonths !== 1 ? 's' : ''}`;

  return (
    <AppShell pageTitle={`${employee.first_name} ${employee.last_name} — Profile`}>
      {/* Breadcrumb */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
          <Link href="/employees" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>
            Employees
          </Link>
          <span>/</span>
          <span>{employee.employee_number}</span>
          <span>/</span>
          <span>{employee.last_name}, {employee.first_name}</span>
        </div>
      </div>

      {/* Hero Banner Card */}
      <Card style={{ marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div
          style={{
            height: '80px',
            background: 'linear-gradient(135deg, var(--brand-dark-blue) 0%, var(--brand-blue) 60%, var(--brand-accent) 100%)',
          }}
        />
        <div style={{ padding: '0 2rem 1.75rem 2rem', position: 'relative' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              flexWrap: 'wrap',
              gap: '1rem',
              marginTop: '-40px',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '1.25rem' }}>
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: 'var(--radius-lg)',
                  background: 'linear-gradient(135deg, var(--brand-dark-blue) 0%, var(--brand-blue) 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 800,
                  border: '4px solid #ffffff',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                {initials}
              </div>
              <div>
                <h1 style={{ fontSize: '1.6rem', color: 'var(--brand-dark-blue)', margin: 0 }}>
                  {employee.first_name} {employee.middle_name ? `${employee.middle_name} ` : ''}{employee.last_name}
                </h1>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.35rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--brand-blue)', fontSize: '0.95rem' }}>
                    {employee.employee_number}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>•</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{employee.email}</span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <Button
                variant={employee.status === 'active' ? 'outline' : 'success'}
                size="sm"
                onClick={handleToggleStatus}
                isLoading={updatingStatus}
              >
                {employee.status === 'active' ? 'Deactivate Staff' : 'Reactivate Staff'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => router.push(`/employees/${employee.id}/edit`)}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                Edit Employee
              </Button>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {employee.status === 'active' ? (
              <Badge variant="success" dot>Active on Payroll</Badge>
            ) : employee.status === 'inactive' ? (
              <Badge variant="warning" dot>Inactive / Leave</Badge>
            ) : (
              <Badge variant="danger" dot>Separated / Terminated</Badge>
            )}
            <Badge variant="brand">{employee.employment_type.toUpperCase()}</Badge>
            <Badge variant="neutral">{employee.department?.name || 'Department'}</Badge>
            <Badge variant="neutral">{employee.position?.title || 'Position'}</Badge>
          </div>
        </div>
      </Card>

      {/* Grid of Profile Details */}
      <div className="dashboard-content-grid" style={{ gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
        {/* Left Column: Organization & Identity */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Organizational Hierarchy</CardTitle>
              <CardSubtitle>Departmental assignment, job role designation, and tenure</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div className="profile-detail-list">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Business Unit / Department</span>
                  <span className="profile-detail-value">
                    <strong>{employee.department?.name || '—'}</strong>
                    {employee.department?.code && (
                      <span style={{ marginLeft: '6px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                        ({employee.department.code})
                      </span>
                    )}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Designated Job Title</span>
                  <span className="profile-detail-value">
                    <strong>{employee.position?.title || '—'}</strong>
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Employment Classification</span>
                  <span className="profile-detail-value" style={{ textTransform: 'capitalize' }}>
                    {employee.employment_type}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Official Date of Hire</span>
                  <span className="profile-detail-value">
                    {new Date(employee.hire_date).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Recorded Length of Service</span>
                  <span className="profile-detail-value">
                    <Badge variant="info">{tenureStr}</Badge>
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Personal Identification</CardTitle>
              <CardSubtitle>Legal name and system credentials</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div className="profile-detail-list">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">First Name</span>
                  <span className="profile-detail-value">{employee.first_name}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Middle Name</span>
                  <span className="profile-detail-value">{employee.middle_name || '—'}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Last Name</span>
                  <span className="profile-detail-value">{employee.last_name}</span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Corporate Email</span>
                  <span className="profile-detail-value" style={{ color: 'var(--brand-blue)', fontWeight: 500 }}>
                    {employee.email}
                  </span>
                </div>
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Record Created</span>
                  <span className="profile-detail-value" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(employee.created_at).toLocaleString('en-US')}
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Right Column: Compensation & Payroll Rates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <Card>
            <CardHeader>
              <CardTitle>Compensation & Rates</CardTitle>
              <CardSubtitle>Philippine labor payroll base rates and statutory multipliers</CardSubtitle>
            </CardHeader>
            <CardBody>
              <div
                style={{
                  padding: '1.25rem',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--brand-dark-blue-light)',
                  border: '1px solid rgba(3, 70, 151, 0.12)',
                  marginBottom: '1.25rem',
                }}
              >
                <div style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--brand-dark-blue)', fontWeight: 700 }}>
                  Basic Contractual Rate ({employee.pay_type})
                </div>
                <div
                  style={{
                    fontSize: '1.9rem',
                    fontWeight: 800,
                    fontFamily: 'monospace',
                    color: 'var(--brand-dark-blue)',
                    marginTop: '0.25rem',
                  }}
                >
                  ₱{Number(employee.basic_salary).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  Standard compensation basis prior to additions and statutory deductions
                </div>
              </div>

              <div className="profile-detail-list">
                <div className="profile-detail-row">
                  <span className="profile-detail-label">Pay Frequency Basis</span>
                  <span className="profile-detail-value" style={{ textTransform: 'capitalize' }}>
                    <strong>{employee.pay_type}</strong>
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Effective Hourly Rate</span>
                  <span className="profile-detail-value" style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    ₱{Number(employee.hourly_rate).toFixed(2)} / hr
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Est. Daily Rate (8 hrs)</span>
                  <span className="profile-detail-value" style={{ fontFamily: 'monospace' }}>
                    ₱{(Number(employee.hourly_rate) * 8).toFixed(2)}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Est. Semi-Monthly Base</span>
                  <span className="profile-detail-value" style={{ fontFamily: 'monospace' }}>
                    ₱{(Number(employee.basic_salary) / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Overtime Rate / Hr (125%)</span>
                  <span className="profile-detail-value" style={{ fontFamily: 'monospace', color: 'var(--brand-accent)' }}>
                    ₱{(Number(employee.hourly_rate) * 1.25).toFixed(2)}
                  </span>
                </div>

                <div className="profile-detail-row">
                  <span className="profile-detail-label">Night Diff Minimum (110%)</span>
                  <span className="profile-detail-value" style={{ fontFamily: 'monospace' }}>
                    ₱{(Number(employee.hourly_rate) * 0.10).toFixed(2)} / hr added
                  </span>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}
