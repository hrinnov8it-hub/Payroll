'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { EmployeeForm } from '@/components/employees/EmployeeForm';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { EmployeeWithRelations, EmployeeFormData } from '@/types/employee';
import { getEmployeeById, updateEmployee } from '@/lib/employees/actions';

export default function EditEmployeePage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async (data: EmployeeFormData) => {
    if (!id) return { success: false, error: 'Missing employee ID' };
    setIsSubmitting(true);
    try {
      const res = await updateEmployee(id, data);
      if (res.success) {
        router.push(`/employees/${id}`);
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to update employee' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'An unexpected error occurred' };
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Edit Employee">
        <div style={{ padding: '4rem 1rem' }}>
          <LoadingState title="Loading Employee Record" message="Retrieving employee details for editing..." />
        </div>
      </AppShell>
    );
  }

  if (!employee) {
    return (
      <AppShell pageTitle="Employee Not Found">
        <EmptyState
          title="Employee Not Found"
          description={`Unable to locate employee with ID "${id}".`}
          actionText="Back to Employees"
          onAction={() => router.push('/employees')}
        />
      </AppShell>
    );
  }

  return (
    <AppShell pageTitle={`Edit: ${employee.first_name} ${employee.last_name}`}>
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
          <Link href="/employees" style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>
            Employees
          </Link>
          <span>/</span>
          <Link href={`/employees/${employee.id}`} style={{ color: 'var(--brand-blue)', textDecoration: 'none' }}>
            {employee.employee_number}
          </Link>
          <span>/</span>
          <span>Edit</span>
        </div>
        <h1 style={{ fontSize: '1.75rem', color: 'var(--brand-dark-blue)' }}>
          Edit Employee: {employee.first_name} {employee.last_name}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginTop: '0.25rem' }}>
          Update employee status, department assignment, job position, or payroll compensation rates.
        </p>
      </div>

      <EmployeeForm
        initialData={employee}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </AppShell>
  );
}
