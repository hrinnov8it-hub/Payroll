'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader } from '@/components/ui/Workspace';
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
      <PageHeader eyebrow="PEOPLE & ORGANIZATION" title="Add employee" description="Manage personal details, department assignment, and payroll rates." back={{ href: '/employees', label: 'Employee directory' }} />

      <EmployeeForm onSubmit={handleSubmit} isSubmitting={isSubmitting} />
    </AppShell>
  );
}
