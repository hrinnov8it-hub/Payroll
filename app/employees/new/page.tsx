'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { EmployeeFormData } from '@/types/employee';
import { createEmployee } from '@/lib/employees/actions';

export default function NewEmployeePage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (data: EmployeeFormData) => {
    setIsSubmitting(true);
    try {
      const res = await createEmployee(data);
      if (res.success && res.data) {
        router.push(`/employees/${res.data.id}`);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to create employee record' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred' };
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppShell pageTitle="Add New Employee">
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <Link href="/employees" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>
            Employees
          </Link>
          <span>/</span>
          <span>Add New</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-dark-blue)' }}>Enrol New Staff Member</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Complete employee profile details, assign departmental hierarchy, and establish payroll compensation.
        </p>
      </div>

      <EmployeeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </AppShell>
  );
}
