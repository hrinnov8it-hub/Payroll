import { createClient } from '@/lib/supabase/client';
import {
  PayrollSummaryReportRow,
  DepartmentTotalsReportRow,
  GovernmentContributionsReport,
  SSSReportRow,
  PhilHealthReportRow,
  PagIbigReportRow,
  TaxSummaryReportRow,
  OvertimeNightDiffReportRow,
  EmployeeHistoryReportRow,
  ReportExecutiveKPIs,
  ReportFilterOptions,
} from '@/types/reports';
import { SEED_PAYSLIPS } from '@/lib/payslips/actions';
import { calculateSSSContribution } from '@/lib/payroll/ph-statutory-sss';
import { calculatePhilHealthContribution } from '@/lib/payroll/ph-statutory-philhealth';
import { calculatePagIbigContribution } from '@/lib/payroll/ph-statutory-pagibig';
import { calculateWithholdingTax } from '@/lib/payroll/ph-tax-withholding';
import { roundToTwoDecimals } from '@/lib/payroll/calculate-rates';

/**
 * Normalizes and fetches all raw payroll data (Supabase with SEED fallback)
 */
async function getRawPayrollData() {
  try {
    const supabase = createClient();
    const { data: runs, error } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        payroll_period:payroll_periods(*),
        items:payroll_run_items(*)
      `)
      .order('created_at', { ascending: false });

    if (!error && runs && runs.length > 0) {
      return runs;
    }
  } catch {
    // Fallback to local / seed data
  }

  // Construct from SEED_PAYSLIPS grouped by run
  const runGroups = new Map<string, typeof SEED_PAYSLIPS>();
  for (const ps of SEED_PAYSLIPS) {
    const rId = ps.payroll_run_id || 'run-seed-001';
    if (!runGroups.has(rId)) {
      runGroups.set(rId, []);
    }
    runGroups.get(rId)!.push(ps);
  }

  const simulatedRuns = Array.from(runGroups.entries()).map(([runId, items]) => {
    const first = items[0];
    return {
      id: runId,
      run_number: first.run_number || 'PR-202609-01',
      status: 'approved',
      payroll_period: {
        id: first.period_id || 'period-2026-09-1',
        name: first.period_name || 'September 1-15, 2026 (1st Cutoff)',
        start_date: first.period_start || '2026-09-01',
        end_date: first.period_end || '2026-09-15',
        payout_date: first.payout_date || '2026-09-15',
      },
      items: items.map((it) => ({
        ...it,
        employee_name_snapshot: it.employee_name,
        employee_number_snapshot: it.employee_number,
        department_snapshot: it.department,
        basic_salary_snapshot: it.basic_salary,
        hourly_rate_snapshot: it.hourly_rate,
      })),
    };
  });

  return simulatedRuns;
}

/**
 * 1. Executive Summary KPIs across selected filters
 */
export async function getExecutiveKPIs(
  filters?: ReportFilterOptions
): Promise<ReportExecutiveKPIs> {
  const runs = await getRawPayrollData();
  let totalDisbursed = 0;
  let totalGross = 0;
  let totalDeductions = 0;
  let totalEmployerBurden = 0;
  let totalGovtRemittance = 0;
  let totalOTPremiums = 0;
  let activeEmployees = new Set<string>();

  for (const run of runs) {
    if (filters?.periodId && run.payroll_period?.id !== filters.periodId) continue;

    for (const item of run.items || []) {
      if (filters?.departmentId && item.department_snapshot !== filters.departmentId) continue;
      if (
        filters?.searchQuery &&
        !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ) {
        continue;
      }

      activeEmployees.add(item.employee_id);
      totalDisbursed += Number(item.net_pay || 0);
      totalGross += Number(item.gross_pay || 0);
      totalDeductions += Number(item.total_deductions || 0);
      totalOTPremiums +=
        Number(item.overtime_pay || 0) +
        Number(item.night_diff_pay || 0) +
        Number(item.holiday_pay || 0) +
        Number(item.rest_day_pay || 0);

      // Compute statutory employer burden
      const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
      const sss = calculateSSSContribution(salary, true);
      const phic = calculatePhilHealthContribution(salary, true);
      const hdmf = calculatePagIbigContribution(salary, true);

      const erTotal = sss.total_employer_cutoff + phic.employer_cutoff + hdmf.employer_cutoff;
      const eeTotal = sss.total_employee_cutoff + phic.employee_cutoff + hdmf.employee_cutoff;

      totalEmployerBurden += erTotal;
      totalGovtRemittance += erTotal + eeTotal;
    }
  }

  return {
    total_payroll_disbursed: roundToTwoDecimals(totalDisbursed),
    total_gross_earnings: roundToTwoDecimals(totalGross),
    total_employee_deductions: roundToTwoDecimals(totalDeductions),
    total_employer_burden: roundToTwoDecimals(totalEmployerBurden),
    total_government_remittances: roundToTwoDecimals(totalGovtRemittance),
    total_overtime_and_premiums: roundToTwoDecimals(totalOTPremiums),
    total_active_employees_processed: activeEmployees.size,
  };
}

/**
 * 2. Payroll Summary Report
 */
export async function getPayrollSummaryReport(
  filters?: ReportFilterOptions
): Promise<PayrollSummaryReportRow[]> {
  const runs = await getRawPayrollData();
  const rows: PayrollSummaryReportRow[] = [];

  for (const run of runs) {
    if (filters?.periodId && run.payroll_period?.id !== filters.periodId) continue;

    let basicPay = 0;
    let otPay = 0;
    let ndPay = 0;
    let holPay = 0;
    let allowances = 0;
    let grossPay = 0;
    let attDeductions = 0;
    let statDeductions = 0;
    let wtax = 0;
    let otherDeductions = 0;
    let totalDeductions = 0;
    let netPay = 0;
    let erContributions = 0;
    let count = 0;

    for (const item of run.items || []) {
      if (filters?.departmentId && item.department_snapshot !== filters.departmentId) continue;
      if (
        filters?.searchQuery &&
        !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ) {
        continue;
      }

      count++;
      basicPay += Number(item.basic_pay || 0);
      otPay += Number(item.overtime_pay || 0);
      ndPay += Number(item.night_diff_pay || 0);
      holPay += Number(item.holiday_pay || 0);
      allowances += Number(item.allowances || 0);
      grossPay += Number(item.gross_pay || 0);

      const late = Number(item.late_deduction || 0);
      const undertime = Number(item.undertime_deduction || 0);
      const absence = Number(item.absence_deduction || 0);
      attDeductions += late + undertime + absence;

      const sssEE = Number(item.sss_deduction || 0);
      const phicEE = Number(item.philhealth_deduction || 0);
      const hdmfEE = Number(item.pagibig_deduction || 0);
      const tax = Number(item.tax_deduction || 0);

      statDeductions += sssEE + phicEE + hdmfEE;
      wtax += tax;
      otherDeductions += Number(item.other_deductions || 0);
      totalDeductions += Number(item.total_deductions || 0);
      netPay += Number(item.net_pay || 0);

      // Employer share
      const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
      const sss = calculateSSSContribution(salary, true);
      const phic = calculatePhilHealthContribution(salary, true);
      const hdmf = calculatePagIbigContribution(salary, true);
      erContributions += sss.total_employer_cutoff + phic.employer_cutoff + hdmf.employer_cutoff;
    }

    if (count > 0) {
      rows.push({
        run_id: run.id,
        run_number: run.run_number,
        period_name: run.payroll_period?.name || 'Standard Period',
        period_start: run.payroll_period?.start_date || '',
        period_end: run.payroll_period?.end_date || '',
        payout_date: run.payroll_period?.payout_date || '',
        status: (run.status as any) || 'draft',
        total_employees: count,
        total_basic_pay: roundToTwoDecimals(basicPay),
        total_overtime_pay: roundToTwoDecimals(otPay),
        total_night_diff_pay: roundToTwoDecimals(ndPay),
        total_holiday_pay: roundToTwoDecimals(holPay),
        total_allowances: roundToTwoDecimals(allowances),
        total_gross_pay: roundToTwoDecimals(grossPay),
        total_attendance_deductions: roundToTwoDecimals(attDeductions),
        total_statutory_deductions: roundToTwoDecimals(statDeductions),
        total_withholding_tax: roundToTwoDecimals(wtax),
        total_other_deductions: roundToTwoDecimals(otherDeductions),
        total_deductions: roundToTwoDecimals(totalDeductions),
        total_net_pay: roundToTwoDecimals(netPay),
        total_employer_contributions: roundToTwoDecimals(erContributions),
      });
    }
  }

  return rows;
}

/**
 * 3. Department Totals Report
 */
export async function getDepartmentTotalsReport(
  filters?: ReportFilterOptions
): Promise<DepartmentTotalsReportRow[]> {
  const runs = await getRawPayrollData();
  const deptMap = new Map<
    string,
    {
      employees: Set<string>;
      basic: number;
      ot: number;
      nd: number;
      allowances: number;
      gross: number;
      attDeduct: number;
      statEE: number;
      tax: number;
      totalDeduct: number;
      erContributions: number;
      net: number;
    }
  >();

  for (const run of runs) {
    if (filters?.periodId && run.payroll_period?.id !== filters.periodId) continue;

    for (const item of run.items || []) {
      const dept = item.department_snapshot || 'Unassigned Department';
      if (filters?.departmentId && dept !== filters.departmentId) continue;
      if (
        filters?.searchQuery &&
        !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ) {
        continue;
      }

      if (!deptMap.has(dept)) {
        deptMap.set(dept, {
          employees: new Set(),
          basic: 0,
          ot: 0,
          nd: 0,
          allowances: 0,
          gross: 0,
          attDeduct: 0,
          statEE: 0,
          tax: 0,
          totalDeduct: 0,
          erContributions: 0,
          net: 0,
        });
      }

      const d = deptMap.get(dept)!;
      d.employees.add(item.employee_id);
      d.basic += Number(item.basic_pay || 0);
      d.ot += Number(item.overtime_pay || 0);
      d.nd += Number(item.night_diff_pay || 0);
      d.allowances += Number(item.allowances || 0);
      d.gross += Number(item.gross_pay || 0);

      const late = Number(item.late_deduction || 0);
      const undertime = Number(item.undertime_deduction || 0);
      const absence = Number(item.absence_deduction || 0);
      d.attDeduct += late + undertime + absence;

      const sssEE = Number(item.sss_deduction || 0);
      const phicEE = Number(item.philhealth_deduction || 0);
      const hdmfEE = Number(item.pagibig_deduction || 0);
      d.statEE += sssEE + phicEE + hdmfEE;
      d.tax += Number(item.tax_deduction || 0);
      d.totalDeduct += Number(item.total_deductions || 0);
      d.net += Number(item.net_pay || 0);

      const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
      const sss = calculateSSSContribution(salary, true);
      const phic = calculatePhilHealthContribution(salary, true);
      const hdmf = calculatePagIbigContribution(salary, true);
      d.erContributions += sss.total_employer_cutoff + phic.employer_cutoff + hdmf.employer_cutoff;
    }
  }

  return Array.from(deptMap.entries()).map(([deptName, d]) => ({
    department_name: deptName,
    employee_count: d.employees.size,
    total_basic_pay: roundToTwoDecimals(d.basic),
    total_overtime_pay: roundToTwoDecimals(d.ot),
    total_night_diff_pay: roundToTwoDecimals(d.nd),
    total_allowances: roundToTwoDecimals(d.allowances),
    total_gross_pay: roundToTwoDecimals(d.gross),
    total_attendance_deductions: roundToTwoDecimals(d.attDeduct),
    total_statutory_employee: roundToTwoDecimals(d.statEE),
    total_withholding_tax: roundToTwoDecimals(d.tax),
    total_deductions: roundToTwoDecimals(d.totalDeduct),
    total_employer_contributions: roundToTwoDecimals(d.erContributions),
    total_net_pay: roundToTwoDecimals(d.net),
  }));
}

/**
 * 4. Government Statutory Contribution Summaries (SSS, PhilHealth, Pag-IBIG)
 */
export async function getGovernmentContributionsReport(
  filters?: ReportFilterOptions
): Promise<GovernmentContributionsReport> {
  const runs = await getRawPayrollData();
  const selectedRun =
    (filters?.periodId
      ? runs.find((r) => r.payroll_period?.id === filters.periodId)
      : runs[0]) || runs[0];

  const sssRows: SSSReportRow[] = [];
  const phicRows: PhilHealthReportRow[] = [];
  const hdmfRows: PagIbigReportRow[] = [];

  let totSssEE = 0;
  let totSssER = 0;
  let totPhicEE = 0;
  let totPhicER = 0;
  let totHdmfEE = 0;
  let totHdmfER = 0;

  for (const item of selectedRun?.items || []) {
    if (filters?.departmentId && item.department_snapshot !== filters.departmentId) continue;
    if (
      filters?.searchQuery &&
      !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
      !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
    ) {
      continue;
    }

    const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
    const sss = calculateSSSContribution(salary, true);
    const phic = calculatePhilHealthContribution(salary, true);
    const hdmf = calculatePagIbigContribution(salary, true);

    // SSS Row
    sssRows.push({
      employee_id: item.employee_id,
      employee_name: item.employee_name_snapshot,
      employee_number: item.employee_number_snapshot,
      monthly_salary_credit: sss.monthly_salary_credit,
      regular_ee: sss.regular_ss_employee,
      regular_er: sss.regular_ss_employer,
      wisp_ee: sss.wisp_employee,
      wisp_er: sss.wisp_employer,
      ec_er: sss.ec_employer,
      total_ee: sss.total_employee_cutoff,
      total_er: sss.total_employer_cutoff,
      total_contribution: roundToTwoDecimals(sss.total_employee_cutoff + sss.total_employer_cutoff),
    });

    // PhilHealth Row
    phicRows.push({
      employee_id: item.employee_id,
      employee_name: item.employee_name_snapshot,
      employee_number: item.employee_number_snapshot,
      covered_monthly_salary: phic.monthly_basic_salary,
      premium_rate: phic.premium_rate * 100,
      employee_share: phic.employee_cutoff,
      employer_share: phic.employer_cutoff,
      total_premium: roundToTwoDecimals(phic.employee_cutoff + phic.employer_cutoff),
    });

    // Pag-IBIG Row
    hdmfRows.push({
      employee_id: item.employee_id,
      employee_name: item.employee_name_snapshot,
      employee_number: item.employee_number_snapshot,
      covered_salary: hdmf.monthly_basic_salary,
      employee_mandatory: hdmf.employee_cutoff,
      employee_voluntary: 0,
      employer_mandatory: hdmf.employer_cutoff,
      total_employee_share: hdmf.employee_cutoff,
      total_remittance: roundToTwoDecimals(hdmf.employee_cutoff + hdmf.employer_cutoff),
    });

    totSssEE += sss.total_employee_cutoff;
    totSssER += sss.total_employer_cutoff;
    totPhicEE += phic.employee_cutoff;
    totPhicER += phic.employer_cutoff;
    totHdmfEE += hdmf.employee_cutoff;
    totHdmfER += hdmf.employer_cutoff;
  }

  const grandEE = totSssEE + totPhicEE + totHdmfEE;
  const grandER = totSssER + totPhicER + totHdmfER;

  return {
    period_name: selectedRun?.payroll_period?.name || 'All Periods',
    sss_rows: sssRows,
    philhealth_rows: phicRows,
    pagibig_rows: hdmfRows,
    totals: {
      total_sss_ee: roundToTwoDecimals(totSssEE),
      total_sss_er: roundToTwoDecimals(totSssER),
      total_sss: roundToTwoDecimals(totSssEE + totSssER),
      total_phic_ee: roundToTwoDecimals(totPhicEE),
      total_phic_er: roundToTwoDecimals(totPhicER),
      total_phic: roundToTwoDecimals(totPhicEE + totPhicER),
      total_hdmf_ee: roundToTwoDecimals(totHdmfEE),
      total_hdmf_er: roundToTwoDecimals(totHdmfER),
      total_hdmf: roundToTwoDecimals(totHdmfEE + totHdmfER),
      grand_total_employee_contributions: roundToTwoDecimals(grandEE),
      grand_total_employer_contributions: roundToTwoDecimals(grandER),
      grand_total_remittances: roundToTwoDecimals(grandEE + grandER),
    },
  };
}

/**
 * 5. BIR Withholding Tax Summary Report
 */
export async function getTaxSummaryReport(
  filters?: ReportFilterOptions
): Promise<TaxSummaryReportRow[]> {
  const runs = await getRawPayrollData();
  const rows: TaxSummaryReportRow[] = [];

  for (const run of runs) {
    if (filters?.periodId && run.payroll_period?.id !== filters.periodId) continue;

    for (const item of run.items || []) {
      if (filters?.departmentId && item.department_snapshot !== filters.departmentId) continue;
      if (
        filters?.searchQuery &&
        !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ) {
        continue;
      }

      const gross = Number(item.gross_pay || 0);
      const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
      const sss = calculateSSSContribution(salary, true);
      const phic = calculatePhilHealthContribution(salary, true);
      const hdmf = calculatePagIbigContribution(salary, true);

      const statExempt = roundToTwoDecimals(
        sss.total_employee_cutoff + phic.employee_cutoff + hdmf.employee_cutoff
      );

      const late = Number(item.late_deduction || 0);
      const undertime = Number(item.undertime_deduction || 0);
      const absence = Number(item.absence_deduction || 0);
      const attDeduct = late + undertime + absence;

      const taxableIncome = Math.max(0, roundToTwoDecimals(gross - attDeduct - statExempt));
      const taxResult = calculateWithholdingTax(taxableIncome, true);

      rows.push({
        employee_id: item.employee_id,
        employee_name: item.employee_name_snapshot,
        employee_number: item.employee_number_snapshot,
        department: item.department_snapshot || 'Unassigned',
        gross_taxable_compensation: gross,
        statutory_contributions_exempt: statExempt,
        net_taxable_compensation: taxableIncome,
        tax_bracket_label: taxResult.tax_bracket_label,
        withholding_tax_amount: Number(item.tax_deduction || taxResult.tax_amount || 0),
      });
    }
  }

  return rows;
}

/**
 * 6. Overtime and Night Shift Differential Summary Report
 */
export async function getOvertimeAndNightDiffReport(
  filters?: ReportFilterOptions
): Promise<OvertimeNightDiffReportRow[]> {
  const runs = await getRawPayrollData();
  const rows: OvertimeNightDiffReportRow[] = [];

  for (const run of runs) {
    if (filters?.periodId && run.payroll_period?.id !== filters.periodId) continue;

    for (const item of run.items || []) {
      if (filters?.departmentId && item.department_snapshot !== filters.departmentId) continue;
      if (
        filters?.searchQuery &&
        !item.employee_name_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase()) &&
        !item.employee_number_snapshot?.toLowerCase().includes(filters.searchQuery.toLowerCase())
      ) {
        continue;
      }

      const regOTHours = Number(item.overtime_hours || 0);
      const regOTPay = Number(item.overtime_pay || 0);
      const rdHours = Number(item.rest_day_hours || 0);
      const rdPay = Number(item.rest_day_pay || 0);
      const holHours = Number(item.holiday_regular_hours || 0) + Number(item.holiday_special_hours || 0);
      const holPay = Number(item.holiday_pay || 0);
      const ndHours = Number(item.night_diff_hours || 0);
      const ndPay = Number(item.night_diff_pay || 0);

      const totalHours = regOTHours + rdHours + holHours + ndHours;
      const totalPay = regOTPay + rdPay + holPay + ndPay;

      rows.push({
        employee_id: item.employee_id,
        employee_name: item.employee_name_snapshot,
        employee_number: item.employee_number_snapshot,
        department: item.department_snapshot || 'Unassigned',
        regular_overtime_hours: regOTHours,
        regular_overtime_pay: regOTPay,
        rest_day_hours: rdHours,
        rest_day_pay: rdPay,
        holiday_hours: holHours,
        holiday_pay: holPay,
        night_diff_hours: ndHours,
        night_diff_pay: ndPay,
        total_premium_hours: roundToTwoDecimals(totalHours),
        total_premium_pay: roundToTwoDecimals(totalPay),
      });
    }
  }

  return rows;
}

/**
 * 7. Employee History Report (Chronological trajectory of an employee)
 */
export async function getEmployeePayrollHistory(
  employeeId: string
): Promise<EmployeeHistoryReportRow[]> {
  const runs = await getRawPayrollData();
  const history: EmployeeHistoryReportRow[] = [];

  for (const run of runs) {
    for (const item of run.items || []) {
      if (item.employee_id === employeeId) {
        const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
        const sss = calculateSSSContribution(salary, true);
        const phic = calculatePhilHealthContribution(salary, true);
        const hdmf = calculatePagIbigContribution(salary, true);

        history.push({
          period_name: run.payroll_period?.name || 'Standard Period',
          payout_date: run.payroll_period?.payout_date || '',
          run_number: run.run_number,
          status: (run.status as any) || 'draft',
          days_worked: Number(item.days_worked || 0),
          regular_hours: Number(item.regular_hours || 0),
          overtime_hours: Number(item.overtime_hours || 0),
          night_diff_hours: Number(item.night_diff_hours || 0),
          basic_pay: Number(item.basic_pay || 0),
          overtime_pay: Number(item.overtime_pay || 0),
          night_diff_pay: Number(item.night_diff_pay || 0),
          holiday_pay: Number(item.holiday_pay || 0),
          allowances: Number(item.allowances || 0),
          bonuses: Number(item.bonuses || 0),
          gross_pay: Number(item.gross_pay || 0),
          attendance_deductions:
            Number(item.late_deduction || 0) +
            Number(item.undertime_deduction || 0) +
            Number(item.absence_deduction || 0),
          sss_deduction: Number(item.sss_deduction || sss.total_employee_cutoff),
          philhealth_deduction: Number(item.philhealth_deduction || phic.employee_cutoff),
          pagibig_deduction: Number(item.pagibig_deduction || hdmf.employee_cutoff),
          tax_deduction: Number(item.tax_deduction || 0),
          other_deductions: Number(item.other_deductions || 0),
          total_deductions: Number(item.total_deductions || 0),
          net_pay: Number(item.net_pay || 0),
        });
      }
    }
  }

  return history;
}

/**
 * 8. RFC 4180 Compliant CSV Export Utility
 */
export function generateReportCSV(headers: string[], rows: (string | number)[][]): string {
  const escapeCell = (val: string | number) => {
    const s = String(val ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  return [headerLine, ...rowLines].join('\r\n');
}
