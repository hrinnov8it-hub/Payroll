'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from '@/components/ui/ErrorState';
import { PayrollDashboard } from '@/components/dashboard/PayrollDashboard';
import { PayrollRun } from '@/types/payroll';
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

  const [loadError, setLoadError] = useState<string | null>(null);

  // Modal & calculation state
  const [isNewRunModalOpen, setIsNewRunModalOpen] = useState(false);
  const [selectedPeriodId, setSelectedPeriodId] = useState('');
  const [runNotes, setRunNotes] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationError, setCalculationError] = useState<string | null>(null);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);
      const [runsData, periodsData, employeesData] = await Promise.all([
        getPayrollRuns(),
        getPayrollPeriods(),
        getEmployees(),
      ]);

      setRuns(runsData);
      setPeriods(periodsData);
      setEmployees(employeesData);

      if (periodsData.length > 0) {
        setSelectedPeriodId((periodsData.find(period => period.status === 'open') || periodsData[0]).id);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setLoadError('Unable to load the dashboard. Please try again.');
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

  const activeEmployeesCount = employees.filter(employee => employee.status === 'active').length;

  return (
    <AppShell pageTitle="Payroll Dashboard">
      <PayrollDashboard
        runs={runs}
        periods={periods}
        employees={employees}
        loading={loading}
        error={loadError}
        onRefresh={loadDashboardData}
        onNewPayroll={() => setIsNewRunModalOpen(true)}
      />

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
              disabled={isCalculating || !selectedPeriodId}
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
                : [{ value: '', label: 'No payroll periods available' }]
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
