'use client';

import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AttendanceRecordWithEmployee, AttendanceFormData } from '@/types/attendance';

interface AttendanceEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecordWithEmployee | null;
  onSave: (data: AttendanceFormData) => Promise<{ success: boolean; error?: string }>;
}

export const AttendanceEntryModal: React.FC<AttendanceEntryModalProps> = ({
  isOpen,
  onClose,
  record,
  onSave,
}) => {
  const [formData, setFormData] = useState<AttendanceFormData>({
    employee_id: '',
    payroll_period_id: '',
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
    notes: '',
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (record) {
      setFormData({
        id: record.id,
        employee_id: record.employee_id,
        payroll_period_id: record.payroll_period_id,
        days_worked: record.days_worked,
        regular_hours: record.regular_hours,
        overtime_hours: record.overtime_hours,
        night_diff_hours: record.night_diff_hours,
        late_minutes: record.late_minutes,
        undertime_minutes: record.undertime_minutes,
        absent_days: record.absent_days,
        holiday_regular_hours: record.holiday_regular_hours,
        holiday_special_hours: record.holiday_special_hours,
        rest_day_hours: record.rest_day_hours,
        notes: record.notes || '',
      });
      setError(null);
    }
  }, [record]);

  if (!record) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await onSave(formData);
      if (res.success) {
        onClose();
      } else {
        setError(res.error || 'Failed to save attendance record');
      }
    } finally {
      setSaving(false);
    }
  };

  const totalEffectiveHours =
    Number(formData.regular_hours || 0) +
    Number(formData.overtime_hours || 0) +
    Number(formData.holiday_regular_hours || 0) +
    Number(formData.holiday_special_hours || 0) +
    Number(formData.rest_day_hours || 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manual DTR & Attendance Entry"
      size="lg"
      footer={
        <>
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={saving}>
            Save Attendance
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit}>
        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}

        {/* Employee Banner */}
        <div
          style={{
            padding: '0.85rem 1rem',
            backgroundColor: '#f8fafc',
            border: '1px solid var(--border-color)',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.5rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)', fontSize: '1.05rem' }}>
              {record.employee?.first_name} {record.employee?.last_name}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '2px' }}>
              <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontWeight: 600 }}>
                {record.employee?.employee_number}
              </span>{' '}
              • {record.employee?.department?.name || 'Department'} • {record.employee?.position?.title || 'Position'}
            </div>
          </div>
          <Badge variant="brand">{record.payroll_period?.name || 'Active Cutoff'}</Badge>
        </div>

        {/* Work Hours & Overtime Grid */}
        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem' }}>
          1. Regular Timekeeping & Overtime Hours
        </h5>
        <div className="form-grid-3" style={{ marginBottom: '1.25rem' }}>
          <Input
            label="Days Worked"
            type="number"
            step="0.5"
            min="0"
            max="15"
            value={formData.days_worked}
            onChange={(e) =>
              setFormData({
                ...formData,
                days_worked: parseFloat(e.target.value) || 0,
                regular_hours: (parseFloat(e.target.value) || 0) * 8,
              })
            }
            helperText="Standard semi-monthly: 11 days"
            required
          />

          <Input
            label="Regular Work Hours"
            type="number"
            step="0.5"
            min="0"
            max="120"
            value={formData.regular_hours}
            onChange={(e) =>
              setFormData({ ...formData, regular_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Base 8 hrs/day"
            required
          />

          <Input
            label="Overtime (OT) Hours"
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={formData.overtime_hours}
            onChange={(e) =>
              setFormData({ ...formData, overtime_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Excess workday hours (125%)"
          />
        </div>

        {/* Night Differential & Holiday Premiums */}
        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem' }}>
          2. Night Shift & Holiday Premiums
        </h5>
        <div className="form-grid-3" style={{ marginBottom: '1.25rem' }}>
          <Input
            label="Night Differential (ND) Hours"
            type="number"
            step="0.5"
            min="0"
            max="100"
            value={formData.night_diff_hours}
            onChange={(e) =>
              setFormData({ ...formData, night_diff_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Worked between 10PM and 6AM"
          />

          <Input
            label="Regular Holiday Hours"
            type="number"
            step="0.5"
            min="0"
            max="40"
            value={formData.holiday_regular_hours}
            onChange={(e) =>
              setFormData({ ...formData, holiday_regular_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Worked on 200% holidays"
          />

          <Input
            label="Special Holiday Hours"
            type="number"
            step="0.5"
            min="0"
            max="40"
            value={formData.holiday_special_hours}
            onChange={(e) =>
              setFormData({ ...formData, holiday_special_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Worked on 130% holidays"
          />
        </div>

        {/* Rest Days, Tardiness & Absences */}
        <h5 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem' }}>
          3. Rest Day Work, Tardiness & Absences
        </h5>
        <div className="form-grid-3" style={{ marginBottom: '1.25rem' }}>
          <Input
            label="Rest Day Hours"
            type="number"
            step="0.5"
            min="0"
            max="40"
            value={formData.rest_day_hours}
            onChange={(e) =>
              setFormData({ ...formData, rest_day_hours: parseFloat(e.target.value) || 0 })
            }
            helperText="Worked on scheduled rest days"
          />

          <Input
            label="Late Tardiness (Minutes)"
            type="number"
            min="0"
            max="999"
            value={formData.late_minutes}
            onChange={(e) =>
              setFormData({ ...formData, late_minutes: parseInt(e.target.value) || 0 })
            }
            helperText="Total late minutes in cutoff"
          />

          <Input
            label="Undertime (Minutes)"
            type="number"
            min="0"
            max="999"
            value={formData.undertime_minutes}
            onChange={(e) =>
              setFormData({ ...formData, undertime_minutes: parseInt(e.target.value) || 0 })
            }
            helperText="Total early departure minutes"
          />
        </div>

        <div className="form-grid-2" style={{ marginBottom: '1.25rem' }}>
          <Input
            label="Unexcused Absence (Days)"
            type="number"
            step="0.5"
            min="0"
            max="15"
            value={formData.absent_days}
            onChange={(e) =>
              setFormData({ ...formData, absent_days: parseFloat(e.target.value) || 0 })
            }
            helperText="Days absent without pay"
          />

          <Input
            label="Audit Notes / Approval Reference"
            placeholder="e.g. Approved sprint OT by Engineering Lead"
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          />
        </div>

        {/* Summary Footer Pill */}
        <div
          style={{
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--brand-dark-blue-light)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid rgba(3, 70, 151, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.88rem',
          }}
        >
          <span style={{ color: 'var(--brand-dark-blue)', fontWeight: 600 }}>
            Total Recorded Productive Hours:
          </span>
          <span style={{ fontFamily: 'monospace', fontWeight: 800, color: 'var(--brand-dark-blue)', fontSize: '1rem' }}>
            {totalEffectiveHours.toFixed(1)} Hours
          </span>
        </div>
      </form>
    </Modal>
  );
};
