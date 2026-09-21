'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { PayrollSettings, PayFrequency } from '@/types/payroll';
import { updatePayrollSettings } from '@/lib/payroll/settings-actions';

interface GeneralSettingsTabProps {
  initialSettings: PayrollSettings;
  onSaved?: (updated: PayrollSettings) => void;
}

export const GeneralSettingsTab: React.FC<GeneralSettingsTabProps> = ({
  initialSettings,
  onSaved,
}) => {
  const [settings, setSettings] = useState<PayrollSettings>(initialSettings);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const res = await updatePayrollSettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        setSaveSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => setSaveSuccess(false), 4000);
      } else {
        setSaveError(res.error || 'Failed to update settings');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave}>
      {saveSuccess && (
        <div className="alert-box" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Payroll schedule and operational settings saved successfully!</span>
        </div>
      )}

      {saveError && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
          </svg>
          <span>{saveError}</span>
        </div>
      )}

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Company & Payout Frequency</CardTitle>
          <CardSubtitle>Corporate entity configuration and standard payout schedule cycle</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-2">
            <Input
              label="Corporate Entity Name"
              value={settings.company_name}
              onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
              required
            />

            <Select
              label="Payroll Disbursement Frequency"
              value={settings.pay_frequency}
              onChange={(e) =>
                setSettings({ ...settings, pay_frequency: e.target.value as PayFrequency })
              }
              options={[
                { label: 'Semi-Monthly (15th & End of Month)', value: 'semi_monthly' },
                { label: 'Monthly (Single Monthly Payout)', value: 'monthly' },
                { label: 'Bi-Weekly (Every 2 Weeks)', value: 'bi_weekly' },
                { label: 'Weekly (Every Week)', value: 'weekly' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Semi-Monthly Cut-off Windows</CardTitle>
          <CardSubtitle>Calendar cut-off boundaries for timekeeping and statutory deductions</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-2">
            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-color)',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.95rem' }}>
                First Half Cut-off (15th Payout)
              </h4>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Usually covers days 1 through 15 of each calendar month.
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Input
                  label="From (Day)"
                  type="number"
                  min="1"
                  max="31"
                  value={settings.first_cutoff_start_day}
                  onChange={(e) =>
                    setSettings({ ...settings, first_cutoff_start_day: parseInt(e.target.value) || 1 })
                  }
                  required
                />
                <Input
                  label="To (Day)"
                  type="number"
                  min="1"
                  max="31"
                  value={settings.first_cutoff_end_day}
                  onChange={(e) =>
                    setSettings({ ...settings, first_cutoff_end_day: parseInt(e.target.value) || 15 })
                  }
                  required
                />
              </div>
            </div>

            <div
              style={{
                padding: '1.25rem',
                borderRadius: 'var(--radius-md)',
                backgroundColor: '#f8fafc',
                border: '1px solid var(--border-color)',
              }}
            >
              <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.95rem' }}>
                Second Half Cut-off (End-Month Payout)
              </h4>
              <p style={{ margin: '0 0 1rem 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                Covers 16th through the final day of the month (set 0 for dynamic end of month).
              </p>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Input
                  label="From (Day)"
                  type="number"
                  min="1"
                  max="31"
                  value={settings.second_cutoff_start_day}
                  onChange={(e) =>
                    setSettings({ ...settings, second_cutoff_start_day: parseInt(e.target.value) || 16 })
                  }
                  required
                />
                <Input
                  label="To (0 = End of Month)"
                  type="number"
                  min="0"
                  max="31"
                  value={settings.second_cutoff_end_day}
                  onChange={(e) =>
                    setSettings({ ...settings, second_cutoff_end_day: parseInt(e.target.value) || 0 })
                  }
                  helperText="0 adapts automatically to 28/29/30/31"
                  required
                />
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Standard Work Calendar & Attendance Thresholds</CardTitle>
          <CardSubtitle>DOLE annual divisor parameters and tardiness grace limits</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Input
              label="Annual Working Days Divisor"
              type="number"
              min="200"
              max="365"
              value={settings.standard_working_days_per_year}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  standard_working_days_per_year: parseInt(e.target.value) || 261,
                })
              }
              helperText="261 for 5-day week; 313 for 6-day week"
              required
            />

            <Input
              label="Standard Daily Hours"
              type="number"
              min="4"
              max="12"
              value={settings.standard_hours_per_day}
              onChange={(e) =>
                setSettings({ ...settings, standard_hours_per_day: parseInt(e.target.value) || 8 })
              }
              helperText="Normal working hours per day"
              required
            />

            <Input
              label="Tardiness Grace Period (Mins)"
              type="number"
              min="0"
              max="60"
              value={settings.grace_period_late_minutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  grace_period_late_minutes: parseInt(e.target.value) || 0,
                })
              }
              helperText="Minutes allowed before late deductions"
              required
            />
          </div>
        </CardBody>
      </Card>

      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Statutory Deductions</CardTitle>
          <CardSubtitle>Enable or disable automatic computation of mandatory government contributions</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-2">
            <Select
              label="Enable Statutory Deductions (SSS, PhilHealth, Pag-IBIG)"
              value={settings.enable_statutory_deductions ? 'true' : 'false'}
              onChange={(e) =>
                setSettings({ ...settings, enable_statutory_deductions: e.target.value === 'true' })
              }
              options={[
                { label: 'Enabled (Compute contributions automatically)', value: 'true' },
                { label: 'Disabled (Do not compute contributions)', value: 'false' },
              ]}
            />
          </div>
        </CardBody>
        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Operational Settings
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
