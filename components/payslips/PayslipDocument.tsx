import React from 'react';
import { Payslip } from '@/types/payslip';
import { Logo } from '@/components/ui/Logo';
import { getItemizedDeductions } from '@/lib/payroll/item-deductions';

interface PayslipDocumentProps {
  payslip: Payslip;
  showWatermark?: boolean;
}

export const PayslipDocument: React.FC<PayslipDocumentProps> = ({
  payslip,
  showWatermark = false,
}) => {
  const deductions = getItemizedDeductions(payslip);

  const formatCurrency = (val?: number) => {
    const num = Number(val || 0);
    return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="payslip-document-wrapper" id="payslip-printable-area">
      <div className="payslip-document">
        {/* Decorative Top Accent Bar */}
        <div className="payslip-accent-bar" />

        {/* Header Section: Branding + Document Reference */}
        <header className="payslip-header">
          <div className="payslip-brand-col">
            <div className="payslip-logo-container">
              <Logo size="lg" theme="light" />
            </div>
            <div className="payslip-company-info">
              <h2 className="payslip-company-name">Innov8IT Solutions Inc.</h2>
              <p className="payslip-company-sub">
                Enterprise Payroll & Technology Services
              </p>
              <p className="payslip-company-meta">
                Metro Manila, Philippines • Tax ID: 009-876-543-000
              </p>
            </div>
          </div>

          <div className="payslip-meta-col">
            <div className="payslip-title-badge">CONFIDENTIAL PAYSLIP</div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Payslip No:</span>
              <span className="payslip-meta-value payslip-mono">{payslip.payslip_number}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Pay Period:</span>
              <span className="payslip-meta-value">{formatDate(payslip.period_start)} – {formatDate(payslip.period_end)}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Payout Date:</span>
              <span className="payslip-meta-value">{formatDate(payslip.payout_date)}</span>
            </div>
            <div className="payslip-meta-row">
              <span className="payslip-meta-label">Run Ref:</span>
              <span className="payslip-meta-value payslip-mono">{payslip.run_number}</span>
            </div>
          </div>
        </header>

        {/* Employee Profile Information Strip */}
        <section className="payslip-employee-strip">
          <div className="payslip-emp-cell">
            <span className="payslip-field-label">Employee Name</span>
            <span className="payslip-field-value payslip-emp-name">{payslip.employee_name}</span>
          </div>
          <div className="payslip-emp-cell">
            <span className="payslip-field-label">Employee Number</span>
            <span className="payslip-field-value payslip-mono payslip-highlight">{payslip.employee_number}</span>
          </div>
          <div className="payslip-emp-cell">
            <span className="payslip-field-label">Department</span>
            <span className="payslip-field-value">{payslip.department || '—'}</span>
          </div>
          <div className="payslip-emp-cell">
            <span className="payslip-field-label">Position / Role</span>
            <span className="payslip-field-value">{payslip.position || '—'}</span>
          </div>
          <div className="payslip-emp-cell">
            <span className="payslip-field-label">Pay Basis</span>
            <span className="payslip-field-value" style={{ textTransform: 'capitalize' }}>
              {payslip.pay_type} Rate
            </span>
          </div>
        </section>

        {/* Attendance & Working Hours Summary Bar */}
        <section className="payslip-attendance-bar">
          <div className="payslip-att-item">
            <span className="payslip-att-label">Days Worked</span>
            <span className="payslip-att-val">{payslip.days_worked} d</span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Regular Hours</span>
            <span className="payslip-att-val">{payslip.regular_hours} hrs</span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Overtime Hours</span>
            <span className="payslip-att-val">{payslip.overtime_hours > 0 ? `${payslip.overtime_hours} hrs` : '0'}</span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Night Diff Hours</span>
            <span className="payslip-att-val">{payslip.night_diff_hours > 0 ? `${payslip.night_diff_hours} hrs` : '0'}</span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Tardiness / Late</span>
            <span className="payslip-att-val" style={{ color: payslip.late_minutes > 0 ? '#b91c1c' : undefined }}>
              {payslip.late_minutes} min
            </span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Undertime</span>
            <span className="payslip-att-val" style={{ color: payslip.undertime_minutes > 0 ? '#b91c1c' : undefined }}>
              {payslip.undertime_minutes} min
            </span>
          </div>
          <div className="payslip-att-item">
            <span className="payslip-att-label">Absences</span>
            <span className="payslip-att-val" style={{ color: payslip.absent_days > 0 ? '#b91c1c' : undefined }}>
              {payslip.absent_days} d
            </span>
          </div>
        </section>

        {/* Main Two-Column Breakdown: Earnings (Left) & Deductions (Right) */}
        <main className="payslip-breakdown-grid">
          {/* EARNINGS COLUMN */}
          <div className="payslip-pane payslip-earnings-pane">
            <div className="payslip-pane-header">
              <span className="payslip-pane-title">EARNINGS</span>
              <span className="payslip-pane-sub">Amount (PHP)</span>
            </div>

            <div className="payslip-rows-container">
              <div className="payslip-line-row">
                <span className="payslip-line-name">Basic Pay</span>
                <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.basic_pay)}</span>
              </div>

              {payslip.overtime_pay > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    Overtime Pay ({payslip.overtime_hours} hrs)
                  </span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.overtime_pay)}</span>
                </div>
              )}

              {payslip.night_diff_pay > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    Night Differential Pay ({payslip.night_diff_hours} hrs)
                  </span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.night_diff_pay)}</span>
                </div>
              )}

              {payslip.holiday_pay > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Holiday Premium Pay</span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.holiday_pay)}</span>
                </div>
              )}

              {payslip.rest_day_pay > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Rest Day Premium Pay</span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.rest_day_pay)}</span>
                </div>
              )}

              {/* Allowances list */}
              {payslip.allowances_list && payslip.allowances_list.length > 0 ? (
                payslip.allowances_list.map((alw, idx) => (
                  <div className="payslip-line-row" key={`alw-${idx}`}>
                    <span className="payslip-line-name">{alw.name}</span>
                    <span className="payslip-line-amount payslip-mono">{formatCurrency(alw.amount)}</span>
                  </div>
                ))
              ) : payslip.allowances > 0 ? (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Allowances</span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.allowances)}</span>
                </div>
              ) : null}

              {/* Bonuses list */}
              {payslip.bonuses_list && payslip.bonuses_list.length > 0 ? (
                payslip.bonuses_list.map((bn, idx) => (
                  <div className="payslip-line-row" key={`bonus-${idx}`}>
                    <span className="payslip-line-name">{bn.name}</span>
                    <span className="payslip-line-amount payslip-mono">{formatCurrency(bn.amount)}</span>
                  </div>
                ))
              ) : payslip.bonuses > 0 ? (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Bonuses / Incentives</span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.bonuses)}</span>
                </div>
              ) : null}

              {Number(payslip.other_earnings || 0) > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Other Earnings</span>
                  <span className="payslip-line-amount payslip-mono">{formatCurrency(payslip.other_earnings)}</span>
                </div>
              )}
            </div>

            <div className="payslip-subtotal-row payslip-subtotal-earnings">
              <span className="payslip-subtotal-label">TOTAL GROSS PAY</span>
              <span className="payslip-subtotal-amount payslip-mono">{formatCurrency(payslip.gross_pay)}</span>
            </div>
          </div>

          {/* DEDUCTIONS COLUMN */}
          <div className="payslip-pane payslip-deductions-pane">
            <div className="payslip-pane-header">
              <span className="payslip-pane-title">DEDUCTIONS</span>
              <span className="payslip-pane-sub">Amount (PHP)</span>
            </div>

            <div className="payslip-rows-container">
              {/* Attendance Tardiness Deductions */}
              {deductions.late.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    Tardiness / Late ({deductions.late.minutes} min)
                  </span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.late.amount)}
                  </span>
                </div>
              )}

              {deductions.undertime.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    Undertime ({deductions.undertime.minutes} min)
                  </span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.undertime.amount)}
                  </span>
                </div>
              )}

              {deductions.absence.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    Absences ({deductions.absence.days} d)
                  </span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.absence.amount)}
                  </span>
                </div>
              )}

              {/* Statutory Mandatory Benefits Deductions (Itemized) */}
              {deductions.sss.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">
                    SSS Employee Contribution
                    {deductions.sss.msc ? ` (MSC: ₱${deductions.sss.msc.toLocaleString()})` : ''}
                  </span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.sss.amount)}
                  </span>
                </div>
              )}

              {deductions.philhealth.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">PhilHealth Contribution</span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.philhealth.amount)}
                  </span>
                </div>
              )}

              {deductions.pagibig.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Pag-IBIG Contribution</span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.pagibig.amount)}
                  </span>
                </div>
              )}

              {deductions.tax.amount > 0 && (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Withholding Tax (BIR)</span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.tax.amount)}
                  </span>
                </div>
              )}

              {/* Other Deductions / Loans */}
              {deductions.other.list && deductions.other.list.length > 0 ? (
                deductions.other.list.map((ded, idx) => (
                  <div className="payslip-line-row" key={`other-ded-${idx}`}>
                    <span className="payslip-line-name">{ded.name}</span>
                    <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                      -{formatCurrency(ded.amount)}
                    </span>
                  </div>
                ))
              ) : deductions.other.amount > 0 ? (
                <div className="payslip-line-row">
                  <span className="payslip-line-name">Other Deductions / Loans</span>
                  <span className="payslip-line-amount payslip-mono payslip-deduct-val">
                    -{formatCurrency(deductions.other.amount)}
                  </span>
                </div>
              ) : null}

              {/* Employer Statutory Contributions Reference */}
              {deductions.employerContributions.total > 0 && (
                <div style={{
                  marginTop: '0.85rem',
                  padding: '0.5rem 0.65rem',
                  backgroundColor: '#f8fafc',
                  border: '1px solid var(--border-color)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.74rem',
                  color: 'var(--text-secondary)',
                }}>
                  <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)', marginBottom: '0.2rem' }}>
                    Employer Statutory Share (Company Paid)
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.4rem', fontFamily: 'monospace' }}>
                    <span>SSS: ₱{deductions.employerContributions.sssER.toFixed(2)}</span>
                    <span>PHIC: ₱{deductions.employerContributions.philhealthER.toFixed(2)}</span>
                    <span>HDMF: ₱{deductions.employerContributions.pagibigER.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="payslip-subtotal-row payslip-subtotal-deductions">
              <span className="payslip-subtotal-label">TOTAL DEDUCTIONS</span>
              <span className="payslip-subtotal-amount payslip-mono payslip-deduct-val">
                -{formatCurrency(deductions.totalDeductions || payslip.total_deductions)}
              </span>
            </div>
          </div>
        </main>

        {/* Prominent Net Pay Banner */}
        <section className="payslip-net-banner">
          <div className="payslip-net-info">
            <span className="payslip-net-title">NET TAKE-HOME PAY</span>
            <span className="payslip-net-hint">Transferred to enrolled payroll bank account</span>
          </div>
          <div className="payslip-net-amount-wrap">
            <span className="payslip-net-amount payslip-mono">
              {formatCurrency(payslip.net_pay)}
            </span>
          </div>
        </section>

        {/* Footer & Employee Confirmation Section */}
        <footer className="payslip-footer">
          <div className="payslip-footer-notice">
            <p className="payslip-notice-heading">CONFIDENTIAL DOCUMENT</p>
            <p className="payslip-notice-body">
              This document contains confidential payroll information intended exclusively for{' '}
              <strong>{payslip.employee_name}</strong>. Unauthorized copying, distribution, or disclosure
              is strictly prohibited under Philippine Data Privacy Act of 2012 (RA 10173).
            </p>
            <p className="payslip-verification-seal">
              Verified by Innov8IT Automated Payroll System • Generated on {formatDate(payslip.created_at)}
            </p>
          </div>

          <div className="payslip-signatures">
            <div className="payslip-signature-box">
              <div className="payslip-sig-line" />
              <span className="payslip-sig-label">Employee Signature / Acknowledgment</span>
              <span className="payslip-sig-sub">{payslip.employee_name}</span>
            </div>
            <div className="payslip-signature-box">
              <div className="payslip-sig-line" />
              <span className="payslip-sig-label">Authorized HR / Finance Officer</span>
              <span className="payslip-sig-sub">Innov8IT Payroll Department</span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};
