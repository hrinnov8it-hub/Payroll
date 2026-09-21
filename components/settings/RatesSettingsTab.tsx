'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PayrollSettings } from '@/types/payroll';
import { updatePayrollSettings } from '@/lib/payroll/settings-actions';

interface RatesSettingsTabProps {
  initialSettings: PayrollSettings;
  onSaved?: (updated: PayrollSettings) => void;
}

export const RatesSettingsTab: React.FC<RatesSettingsTabProps> = ({
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
        setSaveError(res.error || 'Failed to update rates');
      }
    } catch (err: any) {
      setSaveError(err?.message || 'An unexpected error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleResetToStandardDOLE = () => {
    setSettings((prev) => ({
      ...prev,
      overtime_regular_rate: 1.25,
      overtime_rest_day_rate: 1.30,
      overtime_holiday_rate: 2.00,
      night_diff_rate: 0.10,
      night_diff_start_time: '22:00:00',
      night_diff_end_time: '06:00:00',
      regular_holiday_rate: 2.00,
      special_holiday_rate: 1.30,
      rest_day_rate: 1.30,
      rest_day_special_holiday_rate: 1.50,
      rest_day_regular_holiday_rate: 2.60,
    }));
  };

  return (
    <form onSubmit={handleSave}>
      {saveSuccess && (
        <div className="alert-box" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <span>Statutory premium rates and multipliers updated successfully!</span>
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

      {/* Overtime Multipliers */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <CardTitle>Overtime Multipliers (DOLE Compliant)</CardTitle>
              <CardSubtitle>Multiplier applied against employee hourly rate for excess hours beyond 8 hours</CardSubtitle>
            </div>
            <Badge variant="brand" dot>Philippine Labor Code</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Input
              label="Regular Workday Overtime Multiplier"
              type="number"
              step="0.01"
              min="1.00"
              max="5.00"
              value={settings.overtime_regular_rate}
              onChange={(e) =>
                setSettings({ ...settings, overtime_regular_rate: parseFloat(e.target.value) || 1.25 })
              }
              helperText="DOLE standard: 1.25 (125% of hourly rate)"
              required
            />

            <Input
              label="Rest Day Work Overtime Multiplier"
              type="number"
              step="0.01"
              min="1.00"
              max="5.00"
              value={settings.overtime_rest_day_rate}
              onChange={(e) =>
                setSettings({ ...settings, overtime_rest_day_rate: parseFloat(e.target.value) || 1.30 })
              }
              helperText="DOLE standard: 1.30 (130% base on rest day)"
              required
            />

            <Input
              label="Holiday Overtime Multiplier"
              type="number"
              step="0.01"
              min="1.00"
              max="5.00"
              value={settings.overtime_holiday_rate}
              onChange={(e) =>
                setSettings({ ...settings, overtime_holiday_rate: parseFloat(e.target.value) || 2.00 })
              }
              helperText="Multiplier applied during holiday overtime"
              required
            />
          </div>
        </CardBody>
      </Card>

      {/* Night Differential Settings */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
            <div>
              <CardTitle>Night Shift Differential (ND)</CardTitle>
              <CardSubtitle>Mandatory additional compensation for work performed during qualifying night hours</CardSubtitle>
            </div>
            <Badge variant="info">Article 86, Labor Code</Badge>
          </div>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Input
              label="Night Differential Rate Multiplier"
              type="number"
              step="0.01"
              min="0.05"
              max="1.00"
              value={settings.night_diff_rate}
              onChange={(e) =>
                setSettings({ ...settings, night_diff_rate: parseFloat(e.target.value) || 0.10 })
              }
              helperText="DOLE minimum: 0.10 (10% additional per hour)"
              required
            />

            <Input
              label="Night Window Start Time"
              type="time"
              value={settings.night_diff_start_time.slice(0, 5)}
              onChange={(e) =>
                setSettings({ ...settings, night_diff_start_time: `${e.target.value}:00` })
              }
              helperText="Official DOLE start: 10:00 PM (22:00)"
              required
            />

            <Input
              label="Night Window End Time"
              type="time"
              value={settings.night_diff_end_time.slice(0, 5)}
              onChange={(e) =>
                setSettings({ ...settings, night_diff_end_time: `${e.target.value}:00` })
              }
              helperText="Official DOLE end: 6:00 AM (06:00)"
              required
            />
          </div>
        </CardBody>
      </Card>

      {/* Holiday & Rest Day Multipliers */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Holiday & Rest Day Premium Multipliers</CardTitle>
          <CardSubtitle>Compensation rates for work performed on designated rest days and national holidays</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Input
              label="Regular Holiday Rate"
              type="number"
              step="0.01"
              min="1.00"
              max="4.00"
              value={settings.regular_holiday_rate}
              onChange={(e) =>
                setSettings({ ...settings, regular_holiday_rate: parseFloat(e.target.value) || 2.00 })
              }
              helperText="DOLE: 2.00 (200% double pay)"
              required
            />

            <Input
              label="Special Non-Working Holiday Rate"
              type="number"
              step="0.01"
              min="1.00"
              max="4.00"
              value={settings.special_holiday_rate}
              onChange={(e) =>
                setSettings({ ...settings, special_holiday_rate: parseFloat(e.target.value) || 1.30 })
              }
              helperText="DOLE: 1.30 (130% premium)"
              required
            />

            <Input
              label="Rest Day Work Rate"
              type="number"
              step="0.01"
              min="1.00"
              max="4.00"
              value={settings.rest_day_rate}
              onChange={(e) =>
                setSettings({ ...settings, rest_day_rate: parseFloat(e.target.value) || 1.30 })
              }
              helperText="DOLE: 1.30 (130% for scheduled rest day)"
              required
            />
          </div>

          <div className="form-grid-2" style={{ marginTop: '1.25rem' }}>
            <Input
              label="Rest Day falling on Special Holiday"
              type="number"
              step="0.01"
              min="1.00"
              max="4.00"
              value={settings.rest_day_special_holiday_rate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rest_day_special_holiday_rate: parseFloat(e.target.value) || 1.50,
                })
              }
              helperText="DOLE: 1.50 (150% combined premium)"
              required
            />

            <Input
              label="Rest Day falling on Regular Holiday"
              type="number"
              step="0.01"
              min="1.00"
              max="4.00"
              value={settings.rest_day_regular_holiday_rate}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  rest_day_regular_holiday_rate: parseFloat(e.target.value) || 2.60,
                })
              }
              helperText="DOLE: 2.60 (260% combined rate)"
              required
            />
          </div>
        </CardBody>
        <CardFooter style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button
            type="button"
            variant="ghost"
            onClick={handleResetToStandardDOLE}
            disabled={saving}
          >
            Reset to Official DOLE Standards
          </Button>
          <Button type="submit" variant="primary" isLoading={saving}>
            Save Premium Multipliers
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
