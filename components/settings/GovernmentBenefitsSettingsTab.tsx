'use client';

import { useState } from 'react';
import { Card, CardBody, CardFooter, CardHeader, CardSubtitle, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { AlertBanner } from '@/components/ui/ErrorState';
import { calculateSSSContribution } from '@/lib/payroll/ph-statutory-sss';
import { calculatePhilHealthContribution } from '@/lib/payroll/ph-statutory-philhealth';
import { calculatePagIbigContribution } from '@/lib/payroll/ph-statutory-pagibig';
import { updateStatutoryDeductionSetting } from '@/lib/payroll/settings-actions';
import type { PayrollSettings } from '@/types/payroll';
import styles from './GovernmentBenefitsSettingsTab.module.css';

const money = (amount: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);

interface GovernmentBenefitsSettingsTabProps {
  initialSettings: PayrollSettings;
  onSaved: (settings: PayrollSettings) => void;
}

export function GovernmentBenefitsSettingsTab({ initialSettings, onSaved }: GovernmentBenefitsSettingsTabProps) {
  const [enabled, setEnabled] = useState(initialSettings.enable_statutory_deductions !== false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ variant: 'success' | 'error'; text: string } | null>(null);
  const [salary, setSalary] = useState('25000');
  const monthlySalary = Number(salary);
  const validSalary = salary.trim() !== '' && Number.isFinite(monthlySalary) && monthlySalary > 0;
  const sss = calculateSSSContribution(validSalary ? monthlySalary : 0, true);
  const philhealth = calculatePhilHealthContribution(validSalary ? monthlySalary : 0, true);
  const pagibig = calculatePagIbigContribution(validSalary ? monthlySalary : 0, true);
  const rows = [
    { name: 'SSS + mandatory provident fund', ee: sss.total_employee_monthly, er: sss.total_employer_monthly, cutoff: sss.total_employee_cutoff },
    { name: 'PhilHealth', ee: philhealth.employee_monthly, er: philhealth.employer_monthly, cutoff: philhealth.employee_cutoff },
    { name: 'Pag-IBIG', ee: pagibig.employee_monthly, er: pagibig.employer_monthly, cutoff: pagibig.employee_cutoff },
  ];

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const result = await updateStatutoryDeductionSetting(enabled);
      if (!result.success || !result.data) {
        setMessage({ variant: 'error', text: result.error || 'Unable to save government benefit settings.' });
        return;
      }
      setEnabled(result.data.enable_statutory_deductions);
      onSaved(result.data);
      setMessage({ variant: 'success', text: 'Government benefit settings saved.' });
    } catch {
      setMessage({ variant: 'error', text: 'Unable to save. Please try again.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.content}>
      {message && <div role={message.variant === 'error' ? 'alert' : 'status'}><AlertBanner variant={message.variant === 'error' ? 'danger' : 'success'} message={message.text} /></div>}
      <form onSubmit={handleSave}>
        <Card>
          <CardHeader>
            <CardTitle>Government mandated benefits</CardTitle>
            <CardSubtitle>Manage automatic deductions for SSS, PhilHealth, and Pag-IBIG.</CardSubtitle>
          </CardHeader>
          <CardBody>
            <label className={styles.toggle} htmlFor="enable-statutory-deductions">
              <input id="enable-statutory-deductions" type="checkbox" checked={enabled} disabled={saving}
                aria-describedby="statutory-setting-help" onChange={event => { setEnabled(event.target.checked); setMessage(null); }} />
              <span><strong>Enable statutory deductions</strong><small>Compute mandatory contributions automatically when calculating payroll.</small></span>
              <span className={enabled ? styles.enabled : styles.disabled}>{enabled ? 'Enabled' : 'Disabled'}</span>
            </label>
            <p id="statutory-setting-help" className={styles.note}>Automatic statutory deductions also include BIR withholding tax. Changes apply when payroll is calculated again; saved payroll runs keep their recorded amounts.</p>
          </CardBody>
          <CardFooter><Button type="submit" isLoading={saving}>Save benefit settings</Button></CardFooter>
        </Card>
      </form>

      <Card>
        <CardHeader>
          <CardTitle>Contribution rates</CardTitle>
          <CardSubtitle>Private-sector employee schedules checked on October 16, 2026. Employer contributions are paid by the company.</CardSubtitle>
        </CardHeader>
        <CardBody className={styles.rules}>
          <p className={styles.note}>Payroll currently estimates SSS and Pag-IBIG from the employee&apos;s stored salary. Review these against actual monthly compensation and fund salary when employees receive variable pay or allowances.</p>
          <section>
            <div className={styles.agency}><strong>SSS</strong><span>Effective January 2025</span></div>
            <p><b>Employee: 5%</b> of monthly salary credit. <b>Employer: 10%</b>, plus employer-only EC of ₱10 or ₱30.</p>
            <p>Salary credits range from ₱5,000 to ₱35,000 in ₱500 brackets. Credits above ₱20,000 go to the mandatory provident fund. Maximum employee share: <b>₱1,750/month</b>.</p>
            <a href="https://www.sss.gov.ph/wp-content/uploads/2024/12/CI-2024-006-Publication.pdf" target="_blank" rel="noreferrer">SSS Circular 2024-006 ↗</a>
          </section>
          <section>
            <div className={styles.agency}><strong>PhilHealth</strong><span>5% total premium</span></div>
            <p><b>Employee: 2.5%</b> and <b>employer: 2.5%</b> of monthly basic salary, with a ₱10,000 floor and ₱100,000 ceiling.</p>
            <p>Employee share: <b>₱250–₱2,500/month</b>. Overtime, allowances, bonuses, and deductions for absences or tardiness do not change the basic salary used.</p>
            <a href="https://www.philhealth.gov.ph/advisories/2025/PA2025-0002.pdf" target="_blank" rel="noreferrer">PhilHealth premium schedule ↗</a>
          </section>
          <section>
            <div className={styles.agency}><strong>Pag-IBIG</strong><span>Effective February 2024</span></div>
            <p><b>Employee: 1%</b> at a monthly fund salary of ₱1,500 or below; <b>2%</b> above ₱1,500. <b>Employer: 2%</b>.</p>
            <p>The fund salary ceiling is ₱10,000. Maximum mandatory employee and employer shares: <b>₱200/month each</b>. Voluntary additional savings are separate.</p>
            <a href="https://mpm.ph/wp-content/uploads/2024/01/HDMF-Circular-No.-460-Pag-ibig-HDMF-Table-2024.pdf" target="_blank" rel="noreferrer">Pag-IBIG Circular 460 (document copy) ↗</a>
          </section>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Check a deduction</CardTitle>
          <CardSubtitle>Preview monthly contributions and an equal split across two semi-monthly payouts.</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className={styles.salary}>
            <Input id="benefits-preview-salary" label="Monthly salary for this example (PHP)" type="number" min="0.01" step="0.01" value={salary}
              onChange={event => setSalary(event.target.value)} error={!validSalary ? 'Enter a monthly salary greater than zero.' : undefined} />
            <p className={styles.note}>This example assumes basic salary equals SSS compensation and Pag-IBIG fund salary. Actual monthly remuneration, allowances, and adjustments can change these bases. It excludes withholding tax, loans, and voluntary savings.</p>
          </div>
          {validSalary && <div className="table-container"><table className={`table ${styles.preview}`}>
            <caption className={styles.caption}>Contribution preview for {money(monthlySalary)} per month</caption>
            <thead><tr><th scope="col">Benefit</th><th scope="col">Employee / month</th><th scope="col">Employer / month</th><th scope="col">Employee / half-month</th></tr></thead>
            <tbody>{rows.map(row => <tr key={row.name}><th scope="row">{row.name}</th><td>{money(row.ee)}</td><td>{money(row.er)}</td><td>{money(row.cutoff)}</td></tr>)}</tbody>
            <tfoot><tr><th scope="row">Total</th><td>{money(rows.reduce((sum, row) => sum + row.ee, 0))}</td><td>{money(rows.reduce((sum, row) => sum + row.er, 0))}</td><td>{money(rows.reduce((sum, row) => sum + row.cutoff, 0))}</td></tr></tfoot>
          </table></div>}
          <p className={styles.note}>SSS employer amounts include EC. The employee total is the amount deducted from pay. The company pays the employer total separately. Preview values do not change when automatic deductions are disabled.</p>
        </CardBody>
      </Card>
    </div>
  );
}
