'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { PayslipDocument } from '@/components/payslips/PayslipDocument';
import { PayslipPrintButton } from '@/components/payslips/PayslipPrintButton';
import { Payslip, PayslipAccessUser } from '@/types/payslip';
import { getPayslipById, markPayslipAsViewed } from '@/lib/payslips/actions';

// Role simulation users for Phase 10 access verification
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

export default function PayslipDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();

  const id = params?.id as string;
  const initialAs = searchParams?.get('as') || 'admin';

  const [selectedUserKey, setSelectedUserKey] = useState<string>(
    SIMULATED_USERS[initialAs] ? initialAs : 'admin'
  );
  const currentUser = SIMULATED_USERS[selectedUserKey];

  const [payslip, setPayslip] = useState<Payslip | null>(null);
  const [loading, setLoading] = useState(true);
  const [unauthorizedError, setUnauthorizedError] = useState<string | null>(null);

  const fetchPayslip = async (user: PayslipAccessUser) => {
    setLoading(true);
    setUnauthorizedError(null);
    try {
      const res = await getPayslipById(id, user);
      if (res.unauthorized) {
        setUnauthorizedError(
          res.error ||
            'Access Denied: Employees are prohibited from accessing another employee’s confidential payslip.'
        );
        setPayslip(null);
      } else if (res.success && res.data) {
        setPayslip(res.data);
        // If employee views their own payslip, mark viewed
        if (user.role === 'employee') {
          markPayslipAsViewed(res.data.id, user);
        }
      } else {
        setUnauthorizedError(res.error || 'Payslip not found.');
        setPayslip(null);
      }
    } catch (err: any) {
      setUnauthorizedError(err?.message || 'Error loading payslip.');
      setPayslip(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayslip(currentUser);
  }, [id, selectedUserKey]);

  const handlePersonaChange = (key: string) => {
    setSelectedUserKey(key);
    router.replace(`/payslips/${id}?as=${key}`);
  };

  return (
    <AppShell>
      <div className="dashboard-container" style={{ paddingBottom: '4rem' }}>
        {/* Navigation & Controls Bar (Hidden during printing) */}
        <div className="payslip-no-print" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
              marginBottom: '1rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Link href={`/payslips`}>
                <Button variant="outline" size="sm">
                  ← Back to Payslips
                </Button>
              </Link>
              {payslip && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--brand-dark-blue)' }}>
                    {payslip.payslip_number}
                  </span>
                  <Badge variant={payslip.status === 'published' ? 'success' : 'brand'}>
                    {payslip.status.toUpperCase()}
                  </Badge>
                </div>
              )}
            </div>

            {payslip && !unauthorizedError && (
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                <PayslipPrintButton size="md" variant="primary" />
              </div>
            )}
          </div>


        </div>

        {/* Content Body */}
        {loading ? (
          <div style={{ padding: '5rem 0' }}>
            <LoadingState message="Verifying authorization and loading payslip..." />
          </div>
        ) : unauthorizedError ? (
          /* 403 Forbidden Unauthorized Access Screen */
          <div className="payslip-unauthorized-card">
            <div className="payslip-unauthorized-icon">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 style={{ color: '#991b1b', fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 800 }}>
              403 • Confidential Document Access Restricted
            </h2>
            <p style={{ color: '#4b5563', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              {unauthorizedError}
            </p>
            <div
              style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-md)',
                padding: '0.75rem 1rem',
                fontSize: '0.78rem',
                color: '#991b1b',
                marginBottom: '1.5rem',
                textAlign: 'left',
              }}
            >
              <strong>Security Policy:</strong> In compliance with Innov8IT confidentiality
              rules and Philippine Data Privacy Act (RA 10173), non-administrative users are strictly
              restricted to their own individual payslip records.
            </div>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem' }}>
              <Link href="/payslips">
                <Button variant="primary">Return to My Payslips</Button>
              </Link>
            </div>
          </div>
        ) : payslip ? (
          /* Validated Branded Payslip Document */
          <PayslipDocument payslip={payslip} />
        ) : null}
      </div>
    </AppShell>
  );
}
