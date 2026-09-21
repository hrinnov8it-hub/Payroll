'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
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
import { AttendanceEntryModal } from '@/components/attendance/AttendanceEntryModal';
import {
  PayrollPeriod,
  AttendanceRecordWithEmployee,
  AttendanceFormData,
  AttendanceFilters,
} from '@/types/attendance';
import { Department } from '@/types/employee';
import { getDepartments } from '@/lib/employees/actions';
import {
  getPayrollPeriods,
  getAttendanceForPeriod,
  saveAttendanceRecord,
} from '@/lib/attendance/actions';

export default function AttendancePage() {
  const [periods, setPeriods] = useState<PayrollPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('');
  const [records, setRecords] = useState<AttendanceRecordWithEmployee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<AttendanceRecordWithEmployee | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Load initial payroll periods and departments
  useEffect(() => {
    async function init() {
      try {
        setLoading(true);
        const [periodList, deptList] = await Promise.all([
          getPayrollPeriods(),
          getDepartments(),
        ]);
        setPeriods(periodList);
        setDepartments(deptList);

        if (periodList.length > 0) {
          setSelectedPeriodId(periodList[0].id);
        }
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // Load attendance records whenever selectedPeriodId, search, or department changes
  const loadAttendanceData = useCallback(async () => {
    if (!selectedPeriodId) return;
    try {
      setLoading(true);
      const filters: AttendanceFilters = {
        department_id: selectedDepartment,
        search: searchTerm,
      };
      const data = await getAttendanceForPeriod(selectedPeriodId, filters);
      setRecords(data);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriodId, selectedDepartment, searchTerm]);

  useEffect(() => {
    if (selectedPeriodId) {
      loadAttendanceData();
    }
  }, [loadAttendanceData, selectedPeriodId]);

  const activePeriod = periods.find((p) => p.id === selectedPeriodId);

  // Metrics calculations
  const totalEmployees = records.length;
  const completedDTRs = records.filter((r) => r.days_worked > 0 || r.absent_days > 0).length;
  const totalRegularHours = records.reduce((sum, r) => sum + Number(r.regular_hours || 0), 0);
  const totalOvertimeHours = records.reduce((sum, r) => sum + Number(r.overtime_hours || 0), 0);
  const totalNightDiffHours = records.reduce((sum, r) => sum + Number(r.night_diff_hours || 0), 0);
  const totalLateMinutes = records.reduce((sum, r) => sum + Number(r.late_minutes || 0), 0);
  const totalAbsences = records.reduce((sum, r) => sum + Number(r.absent_days || 0), 0);

  const handleOpenEdit = (rec: AttendanceRecordWithEmployee) => {
    setSelectedRecord(rec);
    setIsModalOpen(true);
  };

  const handleSaveAttendance = async (formData: AttendanceFormData) => {
    const res = await saveAttendanceRecord(formData);
    if (res.success && res.data) {
      setRecords((prev) =>
        prev.map((item) =>
          item.employee_id === formData.employee_id &&
          item.payroll_period_id === formData.payroll_period_id
            ? res.data!
            : item
        )
      );
      setSuccessToast(`DTR saved successfully for ${res.data.employee?.first_name || 'employee'}`);
      setTimeout(() => setSuccessToast(null), 3500);
      return { success: true };
    }
    return { success: false, error: res.error };
  };

  const handleAutoFillStandard = async () => {
    if (!confirm('This will populate default standard attendance (11 days / 88 hrs) for all employees with 0 hours in this cutoff. Continue?')) {
      return;
    }

    setLoading(true);
    try {
      for (const rec of records) {
        if (rec.days_worked === 0 && rec.regular_hours === 0 && rec.absent_days === 0) {
          await saveAttendanceRecord({
            employee_id: rec.employee_id,
            payroll_period_id: selectedPeriodId,
            days_worked: 11,
            regular_hours: 88,
            overtime_hours: 0,
            night_diff_hours: 0,
            late_minutes: 0,
            undertime_minutes: 0,
            absent_days: 0,
            holiday_regular_hours: 0,
            holiday_special_hours: 0,
            rest_day_hours: 0,
            notes: 'Auto-populated standard 11-day cutoff',
          });
        }
      }
      await loadAttendanceData();
      setSuccessToast('Standard attendance hours populated successfully!');
      setTimeout(() => setSuccessToast(null), 3500);
    } finally {
      setLoading(false);
    }
  };

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
                Attendance & Time Inputs
              </h1>
              
            </div>
            <p style={{ margin: '0.35rem 0 0 0', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
              Record Daily Time Records (DTR), overtime, night differential, tardiness, and holiday hours for payroll cutoffs.
            </p>
          </div>

          {/* Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
              Payroll Cutoff:
            </span>
            <div style={{ minWidth: '260px' }}>
              <Select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                options={periods.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.status.toUpperCase()})`,
                }))}
              />
            </div>
          </div>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div
            className="alert-box alert-success"
            style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{successToast}</span>
          </div>
        )}

        {/* Active Period Banner */}
        {activePeriod && (
          <div className="attendance-period-banner">
            <div className="attendance-period-info">
              <div className="attendance-period-title">
                <span>{activePeriod.name}</span>
                <Badge variant={activePeriod.status === 'open' ? 'success' : activePeriod.status === 'processing' ? 'warning' : 'neutral'}>
                  {activePeriod.status.toUpperCase()}
                </Badge>
              </div>
              <div className="attendance-period-meta">
                <span>
                  <strong>Cutoff Dates:</strong> {activePeriod.start_date} to {activePeriod.end_date}
                </span>
                <span>•</span>
                <span>
                  <strong>Scheduled Payout:</strong> {activePeriod.payout_date}
                </span>
                <span>•</span>
                <span>
                  <strong>Standard Workdays:</strong> 11 Days (88 Regular Hours)
                </span>
              </div>
            </div>

            <div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoFillStandard}
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.12)',
                  borderColor: 'rgba(255, 255, 255, 0.3)',
                  color: '#ffffff',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="12" y1="18" x2="12" y2="12" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                </svg>
                Populate Standard 11-Day Hours
              </Button>
            </div>
          </div>
        )}

        {/* Metrics Overview Cards */}
        <div className="attendance-summary-cards">
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Employees in Cutoff</span>
            <span className="attendance-metric-value">{totalEmployees}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {completedDTRs} of {totalEmployees} records logged
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Regular Hours</span>
            <span className="attendance-metric-value" style={{ color: 'var(--brand-dark-blue)' }}>
              {totalRegularHours.toFixed(1)} hrs
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Base workday productive time
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Overtime (OT)</span>
            <span className="attendance-metric-value" style={{ color: '#1d4ed8' }}>
              {totalOvertimeHours.toFixed(1)} hrs
            </span>
            <span style={{ fontSize: '0.75rem', color: '#1d4ed8' }}>
              At 125% regular wage rate
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Night Diff (ND)</span>
            <span className="attendance-metric-value" style={{ color: '#7e22ce' }}>
              {totalNightDiffHours.toFixed(1)} hrs
            </span>
            <span style={{ fontSize: '0.75rem', color: '#7e22ce' }}>
              10:00 PM – 6:00 AM premium
            </span>
          </div>

          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Lates & Undertime</span>
            <span className="attendance-metric-value" style={{ color: totalLateMinutes > 0 ? '#b91c1c' : 'var(--text-main)' }}>
              {totalLateMinutes} mins
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {totalAbsences > 0 ? `${totalAbsences} day(s) absent` : 'Zero unexcused absences'}
            </span>
          </div>
        </div>

        {/* Filter & Search Bar */}
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
            <div style={{ display: 'flex', gap: '1rem', flex: '1 1 300px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 220px' }}>
                <Input
                  placeholder="Search by employee name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div style={{ width: '200px' }}>
                <Select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  options={[
                    { value: 'all', label: 'All Departments' },
                    ...departments.map((d) => ({ value: d.id, label: d.name })),
                  ]}
                />
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{records.length}</strong> employee DTR entries
            </div>
          </div>
        </Card>

        {/* Attendance Records Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '3rem 0' }}>
              <LoadingState message="Loading time & attendance records..." />
            </div>
          ) : records.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem' }}>
              <EmptyState
                title="No attendance records found"
                description="No employee records matched the selected period or filters."
              />
            </div>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>Employee</TableHeaderCell>
                    <TableHeaderCell>Days Worked</TableHeaderCell>
                    <TableHeaderCell>Regular Hrs</TableHeaderCell>
                    <TableHeaderCell>Overtime (OT)</TableHeaderCell>
                    <TableHeaderCell>Night Diff (ND)</TableHeaderCell>
                    <TableHeaderCell>Holiday / Rest Day</TableHeaderCell>
                    <TableHeaderCell>Tardiness & Absences</TableHeaderCell>
                    <TableHeaderCell>Notes</TableHeaderCell>
                    <TableHeaderCell align="right">Actions</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {records.map((rec) => {
                    const totalHolidayHours =
                      Number(rec.holiday_regular_hours || 0) +
                      Number(rec.holiday_special_hours || 0) +
                      Number(rec.rest_day_hours || 0);

                    const hasDeduction =
                      rec.late_minutes > 0 || rec.undertime_minutes > 0 || rec.absent_days > 0;

                    return (
                      <TableRow key={rec.id || rec.employee_id}>
                        <TableCell>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>
                              {rec.employee?.first_name} {rec.employee?.last_name}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontWeight: 600 }}>
                                {rec.employee?.employee_number}
                              </span>
                              <span>•</span>
                              <span>{rec.employee?.department?.name || 'Dept'}</span>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <span style={{ fontWeight: 700, fontFamily: 'monospace', fontSize: '0.95rem' }}>
                            {rec.days_worked} d
                          </span>
                        </TableCell>

                        <TableCell>
                          <span className="hours-pill hours-regular">
                            {rec.regular_hours.toFixed(1)} hrs
                          </span>
                        </TableCell>

                        <TableCell>
                          {rec.overtime_hours > 0 ? (
                            <span className="hours-pill hours-overtime">
                              +{rec.overtime_hours.toFixed(1)} hrs
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {rec.night_diff_hours > 0 ? (
                            <span className="hours-pill hours-nightdiff">
                              +{rec.night_diff_hours.toFixed(1)} hrs
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {totalHolidayHours > 0 ? (
                            <span className="hours-pill hours-holiday">
                              +{totalHolidayHours.toFixed(1)} hrs
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </TableCell>

                        <TableCell>
                          {hasDeduction ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                              {rec.late_minutes > 0 && (
                                <span className="hours-pill hours-deduction">
                                  {rec.late_minutes}m late
                                </span>
                              )}
                              {rec.undertime_minutes > 0 && (
                                <span className="hours-pill hours-deduction">
                                  {rec.undertime_minutes}m undertime
                                </span>
                              )}
                              {rec.absent_days > 0 && (
                                <span className="hours-pill hours-deduction">
                                  {rec.absent_days}d absent
                                </span>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: 'var(--success)', fontSize: '0.82rem', fontWeight: 600 }}>
                              Perfect Timekeeping
                            </span>
                          )}
                        </TableCell>

                        <TableCell>
                          <span
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              maxWidth: '180px',
                              display: 'inline-block',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                            title={rec.notes || ''}
                          >
                            {rec.notes || '—'}
                          </span>
                        </TableCell>

                        <TableCell align="right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEdit(rec)}
                          >
                            <svg
                              width="14"
                              height="14"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              style={{ marginRight: '4px' }}
                            >
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                            </svg>
                            Enter / Edit DTR
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Card>

        {/* Modal for Manual Entry / Edit */}
        <AttendanceEntryModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          record={selectedRecord}
          onSave={handleSaveAttendance}
        />
      </div>
    </AppShell>
  );
}
