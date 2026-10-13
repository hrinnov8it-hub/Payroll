import {
  getExecutiveKPIs,
  getPayrollSummaryReport,
  getDepartmentTotalsReport,
  getGovernmentContributionsReport,
  getTaxSummaryReport,
  getOvertimeAndNightDiffReport,
  getEmployeePayrollHistory,
  generateReportCSV,
} from '../actions';
import { updateLocalRunCache } from '@/lib/payroll/runs-actions';
import { PayrollRunWithItems } from '@/types/payroll';

export async function runReportsTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`✓ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // Ensure test run fixture is loaded in local cache for isolated tests
  const testReportRun: PayrollRunWithItems = {
    id: 'test-run-reports-001',
    run_number: 'PR-2026-TEST',
    status: 'locked',
    payroll_period_id: 'period-test-01',
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    payroll_period: {
      id: 'period-test-01',
      name: 'Jan 1-15, 2026 Cutoff',
      start_date: '2026-01-01',
      end_date: '2026-01-15',
      payout_date: '2026-01-20',
      status: 'active',
    },
    total_gross_pay: 23528.77,
    total_deductions: 2475,
    total_net_pay: 21053.77,
    total_employees: 1,
    items: [
      {
        id: 'item-reports-001',
        payroll_run_id: 'test-run-reports-001',
        employee_id: 'emp-001',
        employee_number_snapshot: 'EMP-2026-001',
        employee_name_snapshot: 'Juan Dela Cruz',
        department_snapshot: 'Tech Department',
        position_snapshot: 'Sr. Tech',
        pay_type_snapshot: 'monthly',
        basic_salary_snapshot: 40000,
        hourly_rate_snapshot: 229.89,
        days_worked: 11,
        regular_hours: 88,
        overtime_hours: 5,
        night_diff_hours: 4,
        holiday_regular_hours: 0,
        holiday_special_hours: 0,
        rest_day_hours: 0,
        late_minutes: 0,
        undertime_minutes: 0,
        absent_days: 0,
        basic_pay: 20000,
        overtime_pay: 1436.81,
        night_diff_pay: 91.96,
        holiday_pay: 0,
        rest_day_pay: 0,
        allowances: 2000,
        bonuses: 0,
        gross_pay: 23528.77,
        late_deduction: 0,
        undertime_deduction: 0,
        absence_deduction: 0,
        sss_deduction: 675,
        philhealth_deduction: 500,
        pagibig_deduction: 100,
        tax_deduction: 1200,
        employer_contributions: 1950,
        other_deductions: 0,
        total_deductions: 2475,
        net_pay: 21053.77,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ],
  };
  updateLocalRunCache(testReportRun);

  // 1. Executive KPIs
  const kpis = await getExecutiveKPIs();
  assert(kpis.total_payroll_disbursed > 0, 'Executive KPIs: Total Payroll Disbursed > 0', `Got ${kpis.total_payroll_disbursed}`);
  assert(kpis.total_gross_earnings > kpis.total_payroll_disbursed, 'Executive KPIs: Gross > Net Disbursal', `Gross ${kpis.total_gross_earnings}, Net ${kpis.total_payroll_disbursed}`);
  assert(kpis.total_government_remittances > 0, 'Executive KPIs: Government Remittances > 0', `Got ${kpis.total_government_remittances}`);
  assert(kpis.total_employer_burden > 0, 'Executive KPIs: Employer Burden > 0', `Got ${kpis.total_employer_burden}`);
  assert(kpis.total_active_employees_processed > 0, 'Executive KPIs: Processed Employee Count > 0', `Got ${kpis.total_active_employees_processed}`);

  // 2. Payroll Summary Report
  const summary = await getPayrollSummaryReport();
  assert(summary.length > 0, 'Payroll Summary Report returns run rows', `Got ${summary.length} rows`);
  if (summary.length > 0) {
    const row = summary[0];
    const computedNet = Number((row.total_gross_pay - row.total_deductions).toFixed(2));
    assert(row.total_net_pay === computedNet, 'Payroll Summary: Gross - Deductions equals Net Pay', `Net ${row.total_net_pay}, computed ${computedNet}`);
  }

  // 3. Department Totals Report
  const deptTotals = await getDepartmentTotalsReport();
  const hasTechOrInternal = deptTotals.some(
    (d) =>
      d.department_name.toLowerCase().includes('tech') ||
      d.department_name.toLowerCase().includes('internal')
  );
  assert(hasTechOrInternal, 'Department Totals includes designated department');

  // 4. Government Contributions Report
  const govtReport = await getGovernmentContributionsReport();
  assert(govtReport.sss_rows.length > 0, 'Government Contributions: SSS roster populated', `Got ${govtReport.sss_rows.length} rows`);
  assert(govtReport.philhealth_rows.length > 0, 'Government Contributions: PhilHealth roster populated', `Got ${govtReport.philhealth_rows.length} rows`);
  assert(govtReport.pagibig_rows.length > 0, 'Government Contributions: Pag-IBIG roster populated', `Got ${govtReport.pagibig_rows.length} rows`);
  assert(govtReport.totals.grand_total_remittances > 0, 'Government Contributions: Grand Total Remittances > 0', `Got ${govtReport.totals.grand_total_remittances}`);

  const sssSum = Number((govtReport.totals.total_sss_ee + govtReport.totals.total_sss_er).toFixed(2));
  assert(govtReport.totals.total_sss === sssSum, 'Government Contributions: SSS Total equals EE + ER sum');

  // 5. BIR Tax Summary Report
  const taxSummary = await getTaxSummaryReport();
  assert(taxSummary.length > 0, 'Tax Summary Report returns employee tax rows', `Got ${taxSummary.length} rows`);
  if (taxSummary.length > 0) {
    const t = taxSummary[0];
    assert(t.gross_taxable_compensation >= t.net_taxable_compensation, 'Tax Summary: Gross Taxable >= Net Taxable');
    assert(t.statutory_contributions_exempt > 0, 'Tax Summary: Statutory exemptions deducted');
  }

  // 6. Overtime and Night Diff Report
  const otReport = await getOvertimeAndNightDiffReport();
  assert(otReport.length > 0, 'Overtime & Night Diff Report returns rows', `Got ${otReport.length} rows`);

  // 7. Employee History Report
  const empHistory = await getEmployeePayrollHistory('emp-001');
  assert(empHistory.length > 0, 'Employee History returns trajectory for emp-001', `Got ${empHistory.length} history records`);

  // 8. CSV Generator Utility
  const testCSV = generateReportCSV(
    ['Name', 'Department', 'Net Pay'],
    [
      ['Juan Dela Cruz', 'Tech Department', 39102.11],
      ['Ana Patricia Reyes', 'Product, Design & UI', 33319.73], // Contains comma
    ]
  );
  assert(testCSV.includes('Name,Department,Net Pay'), 'CSV Generator: Includes header line');
  assert(testCSV.includes('"Product, Design & UI"'), 'CSV Generator: Properly quotes cells containing commas');

  return { passed, failed, results };
}
