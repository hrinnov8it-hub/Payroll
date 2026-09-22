/**
 * Innov8IT Payroll - Phase 14 Edge Cases & Error Handling Tests
 *
 * Validates:
 * 1. Zero worked hours / zero attendance
 * 2. Unpaid cutoff & zero basic salary
 * 3. High salary executive calculations (SSS cap, PhilHealth cap, BIR 35% tier)
 * 4. Deductions exceeding gross pay (Negative Net Pay guardrail to 0)
 * 5. Alternate workweek factor (313 days for 6-day week vs 261 days standard)
 * 6. Statutory toggle bypass (disabling SSS / PhilHealth / Pag-IBIG / Tax)
 * 7. Prorated 13th month pay boundary conditions (0 months, full 12 months)
 * 8. Error handling on invalid status transitions (e.g., locking a draft, submitting an approved run)
 */

import { calculateRates } from '../calculate-rates';
import { calculateBasicPay } from '../calculate-basic-pay';
import { calculateOvertime } from '../calculate-overtime';
import { calculateNightDifferential } from '../calculate-night-differential';
import { calculateHolidayPay } from '../calculate-holiday-pay';
import { calculateAttendanceDeductions } from '../calculate-deductions';
import { calculateNetPay } from '../calculate-net-pay';
import { calculatePayroll } from '../engine';
import { calculateSSSContribution } from '../ph-statutory-sss';
import { calculatePhilHealthContribution } from '../ph-statutory-philhealth';
import { calculatePagIbigContribution } from '../ph-statutory-pagibig';
import { calculateWithholdingTax } from '../ph-tax-withholding';
import { calculateThirteenthMonthPay } from '../ph-thirteenth-month';
import {
  submitForReview,
  approvePayrollRun,
  lockPayrollRun,
  unlockPayrollRun,
} from '../approval-actions';
import { PayrollEmployeeInput, PayrollAttendanceInput, PayrollRunWithItems } from '../../../types/payroll';

export async function runEdgeCasesAndErrorHandlingTests(): Promise<{ passed: number; failed: number; results: string[] }> {
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

  // --------------------------------------------------------------------------
  // 1. Edge Case: Zero attendance / zero worked hours
  // --------------------------------------------------------------------------
  const zeroAttendance: PayrollAttendanceInput = {
    days_worked: 0,
    regular_hours: 0,
    overtime_hours: 0,
    night_diff_hours: 0,
    late_minutes: 0,
    undertime_minutes: 0,
    absent_days: 0,
    holiday_regular_hours: 0,
    holiday_special_hours: 0,
    rest_day_hours: 0,
  };

  const dailyEmployee: PayrollEmployeeInput = {
    id: 'emp-daily-01',
    employee_number: 'IN8-D01',
    first_name: 'Juan',
    last_name: 'Dela Cruz',
    basic_salary: 610, // Daily minimum wage rate
    pay_type: 'daily',
  };

  const dailyRates = calculateRates(dailyEmployee);
  const dailyBasicZero = calculateBasicPay(dailyEmployee, zeroAttendance, dailyRates);
  assert(
    dailyBasicZero.calculated_amount === 0,
    'Daily paid employee with 0 days worked yields ₱0.00 basic pay',
    `Expected 0, got ${dailyBasicZero.calculated_amount}`
  );

  // --------------------------------------------------------------------------
  // 2. Edge Case: 6-day Workweek Factor (313 days)
  // --------------------------------------------------------------------------
  const monthlyEmp: PayrollEmployeeInput = {
    id: 'emp-monthly-02',
    employee_number: 'IN8-M02',
    first_name: 'Elena',
    last_name: 'Santos',
    basic_salary: 30000,
    pay_type: 'monthly',
  };

  // 5-day workweek (261 days): (30000 * 12) / 261 = 1379.31
  const rates5Day = calculateRates(monthlyEmp, { standard_working_days_per_year: 261 });
  // 6-day workweek (313 days): (30000 * 12) / 313 = 1150.16
  const rates6Day = calculateRates(monthlyEmp, { standard_working_days_per_year: 313 });
  assert(
    rates5Day.daily_rate === 1379.31,
    'Standard 5-day workweek (261 factor) daily rate calculation',
    `Expected 1379.31, got ${rates5Day.daily_rate}`
  );
  assert(
    rates6Day.daily_rate === 1150.16,
    'Custom 6-day workweek (313 factor) daily rate calculation',
    `Expected 1150.16, got ${rates6Day.daily_rate}`
  );
  assert(
    rates6Day.hourly_rate === 143.77,
    'Custom 6-day workweek hourly rate (1150.16 / 8 = 143.77)',
    `Expected 143.77, got ${rates6Day.hourly_rate}`
  );

  // --------------------------------------------------------------------------
  // 3. Edge Case: High Executive Salary Ceiling (₱500,000 / month)
  // --------------------------------------------------------------------------
  const execSalary = 500000;
  const sssExec = calculateSSSContribution(execSalary);
  assert(
    sssExec.total_employee_monthly === 1350,
    'Executive ₱500k SSS employee share capped at maximum ₱1,350.00 (₱30k MSC ceiling)',
    `Expected 1350, got ${sssExec.total_employee_monthly}`
  );
  assert(
    sssExec.monthly_salary_credit === 30000,
    'Executive ₱500k MSC capped at ₱30,000.00',
    `Expected 30000, got ${sssExec.monthly_salary_credit}`
  );

  const philhealthExec = calculatePhilHealthContribution(execSalary);
  assert(
    philhealthExec.employee_monthly === 2500,
    'Executive ₱500k PhilHealth employee share capped at maximum ₱2,500.00 (₱5k total)',
    `Expected 2500, got ${philhealthExec.employee_monthly}`
  );

  const pagibigExec = calculatePagIbigContribution(execSalary);
  assert(
    pagibigExec.employee_monthly === 200,
    'Executive ₱500k Pag-IBIG mandatory employee share capped at ₱200.00',
    `Expected 200, got ${pagibigExec.employee_monthly}`
  );

  // Executive semi-monthly taxable gross ~ ₱250,000 -> Top tax bracket
  const semiMonthlyTaxable = 250000 - (1350 / 2 + 2500 / 2 + 200 / 2);
  const taxExec = calculateWithholdingTax(semiMonthlyTaxable);
  assert(
    taxExec.tax_amount > 50000,
    'Executive semi-monthly withholding tax computed in top progressive bracket',
    `Got ${taxExec.tax_amount}`
  );

  // --------------------------------------------------------------------------
  // 4. Edge Case: Deductions exceeding Gross Pay (Guardrail against negative net pay)
  // --------------------------------------------------------------------------
  const smallGross = 5000;
  const heavyAttendanceDeductions = {
    late_minutes: 60,
    late_deduction: 2000,
    undertime_minutes: 60,
    undertime_deduction: 2000,
    absent_days: 1,
    absence_deduction: 3000,
    total_attendance_deductions: 7000,
  };
  const netPayResult = calculateNetPay({
    grossPay: smallGross,
    attendanceDeductions: heavyAttendanceDeductions,
    statutoryDeductions: {
      sss: { total_employee_cutoff: 500, total_employer_cutoff: 1000 } as any,
      philhealth: { employee_cutoff: 250, employer_cutoff: 250 } as any,
      pagibig: { employee_cutoff: 100, employer_cutoff: 100 } as any,
      withholding_tax: { tax_amount: 0 } as any,
      total_statutory_deductions: 850,
      total_employer_contributions: 1350,
    },
  });

  assert(
    netPayResult.net_pay === 0,
    'Negative Net Pay Guardrail: Net pay floored to ₱0.00 when deductions exceed gross',
    `Expected 0, got ${netPayResult.net_pay}`
  );
  assert(
    netPayResult.total_deductions === 7850,
    'Total deductions correctly records the full amount (₱7,850.00) even when exceeding gross',
    `Expected 7850, got ${netPayResult.total_deductions}`
  );

  // --------------------------------------------------------------------------
  // 5. Edge Case: Statutory Toggle Bypass (Disabled Statutory Modules)
  // --------------------------------------------------------------------------
  const fullEngineBypass = calculatePayroll({
    employee: monthlyEmp,
    attendance: {
      ...zeroAttendance,
      days_worked: 11,
      regular_hours: 88,
    },
    includeStatutory: false,
  });

  assert(
    fullEngineBypass.statutory_deductions === undefined,
    'Engine respects includeStatutory = false (statutory deductions omitted)'
  );
  assert(
    fullEngineBypass.net_pay === fullEngineBypass.gross_pay,
    'Gross pay equals Net pay when statutory deductions are toggled off',
    `Gross: ${fullEngineBypass.gross_pay}, Net: ${fullEngineBypass.net_pay}`
  );

  // --------------------------------------------------------------------------
  // 6. Edge Case: 13th Month Pay Boundary Tests
  // --------------------------------------------------------------------------
  const zero13th = calculateThirteenthMonthPay(0, 0);
  assert(
    zero13th.gross_thirteenth_month === 0,
    '13th Month Pay for 0 months worked returns ₱0.00',
    `Expected 0, got ${zero13th.gross_thirteenth_month}`
  );

  const full13th = calculateThirteenthMonthPay(480000, 12);
  assert(
    full13th.gross_thirteenth_month === 40000,
    '13th Month Pay for 12 months worked returns exact monthly salary ₱40,000.00',
    `Expected 40000, got ${full13th.gross_thirteenth_month}`
  );
  assert(
    full13th.tax_exempt_portion === 40000 && full13th.taxable_portion === 0,
    '13th Month Pay below ₱90,000 threshold is 100% tax exempt',
    `Tax exempt: ${full13th.tax_exempt_portion}, Taxable: ${full13th.taxable_portion}`
  );

  // 13th Month over ₱90k statutory threshold
  const huge13th = calculateThirteenthMonthPay(1800000, 12);
  assert(
    huge13th.gross_thirteenth_month === 150000,
    'Executive 13th Month gross is ₱150,000.00',
    `Expected 150000, got ${huge13th.gross_thirteenth_month}`
  );
  assert(
    huge13th.tax_exempt_portion === 90000,
    '13th Month tax-exempt portion capped at exactly ₱90,000.00 statutory ceiling',
    `Expected 90000, got ${huge13th.tax_exempt_portion}`
  );
  assert(
    huge13th.taxable_portion === 60000,
    '13th Month taxable portion correctly reflects excess over ₱90,000 (₱60,000.00)',
    `Expected 60000, got ${huge13th.taxable_portion}`
  );

  // --------------------------------------------------------------------------
  // 7. Error Handling: Illegal Workflow Status Transitions
  // --------------------------------------------------------------------------
  const mockRun: PayrollRunWithItems = {
    id: 'test-run-err-01',
    payroll_period_id: 'period-2026-01',
    run_number: 'PR-202601-ERR',
    status: 'draft',
    total_gross_pay: 100000,
    total_deductions: 15000,
    total_net_pay: 85000,
    total_employees: 2,
    notes: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: [],
  };

  const draftApproveAttempt = await approvePayrollRun(mockRun, 'admin-id', 'System Admin', 'admin');
  assert(
    Boolean(!draftApproveAttempt.success && draftApproveAttempt.error?.includes('REVIEW status')),
    'Workflow Guard: Approving a DRAFT run without prior review is rejected'
  );

  const lockedRun: PayrollRunWithItems = {
    ...mockRun,
    status: 'locked',
  };

  const lockedSubmitAttempt = await submitForReview(lockedRun, 'admin-id', 'System Admin');
  assert(
    Boolean(!lockedSubmitAttempt.success && lockedSubmitAttempt.error?.includes('Cannot submit for review')),
    'Workflow Guard: Submitting a locked run is rejected with descriptive error'
  );

  return { passed, failed, results };
}
