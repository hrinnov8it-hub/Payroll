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
  assert(deptTotals.length > 0, 'Department Totals Report returns department rows', `Got ${deptTotals.length} departments`);
  const hasEngineering = deptTotals.some((d) => d.department_name.toLowerCase().includes('engineering'));
  assert(hasEngineering, 'Department Totals includes Engineering department');

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
      ['Juan Dela Cruz', 'Engineering', 39102.11],
      ['Ana Patricia Reyes', 'Product, Design & UI', 33319.73], // Contains comma
    ]
  );
  assert(testCSV.includes('Name,Department,Net Pay'), 'CSV Generator: Includes header line');
  assert(testCSV.includes('"Product, Design & UI"'), 'CSV Generator: Properly quotes cells containing commas');

  return { passed, failed, results };
}
