'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button, ButtonLink } from '@/components/ui/Button';
import { PayrollRunItem } from '@/types/payroll';
import { getItemizedDeductions } from '@/lib/payroll/item-deductions';

interface PayrollSnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: PayrollRunItem[];
  initialIndex?: number;
  runId?: string;
}

export const PayrollSnapshotModal: React.FC<PayrollSnapshotModalProps> = ({
  isOpen,
  onClose,
  items,
  initialIndex = 0,
  runId,
}) => {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  if (!isOpen || !items || items.length === 0) return null;

  const currentItem = items[selectedIndex] || items[0];
  const snapshotDeductions = getItemizedDeductions(currentItem);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Payroll Snapshot: ${currentItem.employee_name_snapshot}`}
      size="lg"
      footer={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
          {runId ? (
            <ButtonLink href={`/payroll-runs/${runId}`} variant="outline" size="sm">
              Open Full Run Details →
            </ButtonLink>
          ) : <div />}
          <Button variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      <div>
        {/* If run has multiple employees, provide selector pills */}
        {items.length > 1 && (
          <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
            {items.map((it, idx) => (
              <Button
                size="sm"
                variant={idx === selectedIndex ? "soft" : "outline"}
                aria-pressed={idx === selectedIndex}
                key={it.id}
                type="button"
                onClick={() => setSelectedIndex(idx)}
              >
                {it.employee_name_snapshot}
              </Button>
            ))}
          </div>
        )}

        {/* Top Header Card */}
        <div
          style={{
            padding: '1rem 1.25rem',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)',
            marginBottom: '1.25rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <div style={{ fontWeight: 800, color: 'var(--brand-dark-blue)', fontSize: '1.15rem' }}>
              {currentItem.employee_name_snapshot}
            </div>
            <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: '0.2rem' }}>
              {currentItem.employee_number_snapshot} • {currentItem.department_snapshot || 'General'} • {currentItem.position_snapshot || 'Staff'}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                display: 'inline-block',
                background: '#fff',
                border: '1px solid #cbd5e1',
                padding: '0.25rem 0.65rem',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: 700,
                color: '#334155',
              }}
            >
              🔒 Historical Freeze
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem', fontWeight: 600 }}>
              Pay Type: {(currentItem.pay_type_snapshot || 'monthly').toUpperCase()}
            </div>
          </div>
        </div>

        {/* 1. Applied Rate Basis */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h5 style={{ margin: '0 0 0.65rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem', fontWeight: 700 }}>
            1. Applied Rate Basis
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem' }}>
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                BASIC SALARY
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                ₱{Number(currentItem.basic_salary_snapshot || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                HOURLY RATE
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                ₱{Number(currentItem.hourly_rate_snapshot || 0).toFixed(2)}/hr
              </div>
            </div>

            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: 'var(--radius-md)',
                padding: '0.85rem 1rem',
              }}
            >
              <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', marginBottom: '0.25rem', letterSpacing: '0.04em' }}>
                CUTOFF DAYS / HOURS
              </div>
              <div style={{ fontSize: '1.25rem', fontWeight: 800, fontFamily: 'monospace', color: '#0f172a' }}>
                {currentItem.days_worked}d / {currentItem.regular_hours}hrs
              </div>
            </div>
          </div>
        </div>

        {/* 2. Gross Earnings Breakdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h5 style={{ margin: '0 0 0.65rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem', fontWeight: 700 }}>
            2. Gross Earnings Breakdown
          </h5>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff' }}>
            <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
              <tbody>
                {[
                  ['Cutoff Basic Pay', `₱${Number(currentItem.basic_pay || 0).toFixed(2)}`],
                  [`Overtime Pay (${currentItem.overtime_hours || 0} hrs @ 125%)`, `₱${Number(currentItem.overtime_pay || 0).toFixed(2)}`],
                  [`Night Differential (${currentItem.night_diff_hours || 0} hrs @ 10%)`, `₱${Number(currentItem.night_diff_pay || 0).toFixed(2)}`],
                  ['Holiday Pay Premium', `₱${Number(currentItem.holiday_pay || 0).toFixed(2)}`],
                  ['Rest Day Work Premium', `₱${Number(currentItem.rest_day_pay || 0).toFixed(2)}`],
                  ['Allowances & Bonuses', `₱${(Number(currentItem.allowances || 0) + Number(currentItem.bonuses || 0)).toFixed(2)}`],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.6rem 0.85rem', color: '#334155' }}>{label}</td>
                    <td style={{ padding: '0.6rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {value}
                    </td>
                  </tr>
                ))}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 800 }}>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#0f172a' }}>TOTAL GROSS PAY</td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: 'var(--brand-dark-blue)', fontSize: '1rem' }}>
                    ₱{Number(currentItem.gross_pay || 0).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. Deductions Breakdown */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h5 style={{ margin: '0 0 0.65rem 0', color: 'var(--brand-dark-blue)', fontSize: '0.9rem', fontWeight: 700 }}>
            3. Deductions Breakdown
          </h5>
          <div style={{ border: '1px solid #e2e8f0', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#fff' }}>
            <table style={{ width: '100%', fontSize: '0.88rem', borderCollapse: 'collapse' }}>
              <tbody>
                {/* Attendance Deductions Header */}
                <tr style={{ backgroundColor: '#f8fafc', fontWeight: 700, fontSize: '0.76rem', color: 'var(--brand-dark-blue)' }}>
                  <td colSpan={2} style={{ padding: '0.5rem 0.85rem', borderBottom: '1px solid #e2e8f0' }}>
                    ATTENDANCE & TIME DEDUCTIONS
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem', color: '#334155' }}>
                    Tardiness / Late ({snapshotDeductions.late.minutes} mins)
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.late.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.late.amount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem', color: '#334155' }}>
                    Undertime ({snapshotDeductions.undertime.minutes} mins)
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.undertime.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.undertime.amount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem', color: '#334155' }}>
                    Unexcused Absences ({snapshotDeductions.absence.days} days)
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.absence.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.absence.amount.toFixed(2)}
                  </td>
                </tr>

                {/* Statutory Benefits Header */}
                <tr style={{ backgroundColor: '#eff6ff', fontWeight: 700, fontSize: '0.76rem', color: '#1e40af' }}>
                  <td colSpan={2} style={{ padding: '0.5rem 0.85rem', borderTop: '1px solid #dbeafe', borderBottom: '1px solid #dbeafe' }}>
                    MANDATORY STATUTORY BENEFITS (EMPLOYEE SHARE)
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>SSS Employee Contribution</div>
                    {snapshotDeductions.sss.msc ? (
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                        MSC: ₱{snapshotDeductions.sss.msc.toLocaleString()}
                      </div>
                    ) : null}
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.sss.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.sss.amount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>PhilHealth Contribution</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>5.0% Premium (Semi-Monthly EE Share)</div>
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.philhealth.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.philhealth.amount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>Pag-IBIG / HDMF Contribution</div>
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.pagibig.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    -₱{snapshotDeductions.pagibig.amount.toFixed(2)}
                  </td>
                </tr>
                <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.55rem 0.85rem' }}>
                    <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>Withholding Tax (BIR)</div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                      {snapshotDeductions.tax.amount > 0 ? 'Semi-Monthly Withholding Tax' : 'Tax Exempt (Below Threshold)'}
                    </div>
                  </td>
                  <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: snapshotDeductions.tax.amount > 0 ? '#b91c1c' : '#64748b' }}>
                    {snapshotDeductions.tax.amount > 0 ? `-₱${snapshotDeductions.tax.amount.toFixed(2)}` : '₱0.00'}
                  </td>
                </tr>

                {/* Other Deductions */}
                {snapshotDeductions.other.list.length > 0 &&
                  snapshotDeductions.other.list.map((d, idx) => (
                    <tr key={`other-${idx}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.55rem 0.85rem' }}>{d.name}</td>
                      <td style={{ padding: '0.55rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#b91c1c' }}>
                        -₱{Number(d.amount).toFixed(2)}
                      </td>
                    </tr>
                  ))}

                <tr style={{ backgroundColor: '#fef2f2', fontWeight: 800 }}>
                  <td style={{ padding: '0.75rem 0.85rem', color: '#991b1b' }}>TOTAL DEDUCTIONS</td>
                  <td style={{ padding: '0.75rem 0.85rem', textAlign: 'right', fontFamily: 'monospace', color: '#b91c1c', fontSize: '1rem' }}>
                    -₱{Number(snapshotDeductions.totalDeductions || currentItem.total_deductions).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. Net Pay Summary */}
        <div
          style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)',
            border: '1px solid #bbf7d0',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              NET TAKE-HOME PAY
            </div>
            <div style={{ fontSize: '0.82rem', color: '#15803d' }}>
              Final net disbursement amount
            </div>
          </div>
          <div style={{ fontSize: '1.45rem', fontWeight: 800, fontFamily: 'monospace', color: '#166534' }}>
            ₱{Number(currentItem.net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
      </div>
    </Modal>
  );
};
