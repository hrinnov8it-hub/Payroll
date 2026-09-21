/**
 * Innov8IT Payroll - Phase 7 Calculation Engine Verification Tests
 *
 * Validates:
 * 1. Rates calculation (daily, hourly, minute)
 * 2. Cutoff basic pay (monthly, daily, hourly)
 * 3. Overtime pay (125%)
 * 4. Night differential (+10%)
 * 5. Holiday pay (Regular 200%, Special 130%)
 * 6. Rest day pay (130%)
 * 7. Lates, undertime, and absence deductions
 * 8. Gross pay aggregation
 * 9. Net pay calculation
 */

import { calculateRates } from '../calculate-rates';
import { calculateBasicPay } from '../calculate-basic-pay';
import { calculateOvertime } from '../calculate-overtime';
import { calculateNightDifferential } from '../calculate-night-differential';
import { calculateHolidayPay } from '../calculate-holiday-pay';
import { calculateRestDayPay } from '../calculate-rest-day-pay';
import { calculateAttendanceDeductions } from '../calculate-deductions';
import { calculateGrossPay } from '../calculate-gross-pay';
import { calculateNetPay } from '../calculate-net-pay';
import { calculatePayroll } from '../engine';
import { PayrollEmployeeInput, PayrollAttendanceInput } from '../../../types/payroll';

export function runPayrollEngineTests(): { passed: number; failed: number; results: string[] } {
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

  // Sample Employee: Senior Software Engineer, Monthly ₱95,000
  const employee: PayrollEmployeeInput = {
    id: 'emp-001',
    employee_number: 'IN8-2024-001',
    first_name: 'Rafael',
    last_name: 'Reyes',
    basic_salary: 95000,
    pay_type: 'monthly',
  };

  // 1. Rates Calculation
  // Daily rate = (95,000 * 12) / 261 = 4367.816... -> 4367.82
  // Hourly rate = 4367.816... / 8 = 545.977... -> 545.98
  const rates = calculateRates(employee);
  assert(rates.daily_rate === 4367.82, 'Daily Rate calculation for ₱95,000 monthly', `Got ${rates.daily_rate}, expected 4367.82`);
  assert(rates.hourly_rate === 545.98, 'Hourly Rate calculation for ₱95,000 monthly', `Got ${rates.hourly_rate}, expected 545.98`);

  // 2. Basic Pay
  // Semi-monthly basic pay = 95,000 / 2 = 47,500.00
  const attendanceStandard: PayrollAttendanceInput = {
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
  };
  const basicPay = calculateBasicPay(employee, attendanceStandard, rates);
  assert(basicPay.calculated_amount === 47500.00, 'Semi-monthly Cutoff Basic Pay', `Got ${basicPay.calculated_amount}, expected 47500.00`);

  // 3. Overtime Pay (8.5 hrs OT @ 125%)
  // 545.98 * 8.5 * 1.25 = 5801.0375 -> 5801.04
  const attendanceOT: PayrollAttendanceInput = {
    ...attendanceStandard,
    overtime_hours: 8.5,
  };
  const ot = calculateOvertime(attendanceOT, rates);
  assert(ot.amount === 5801.04, 'Overtime pay at 125%', `Got ${ot.amount}, expected 5801.04`);

  // 4. Night Differential (4 hrs @ 10%)
  // 545.98 * 4 * 0.10 = 218.392 -> 218.39
  const attendanceND: PayrollAttendanceInput = {
    ...attendanceStandard,
    night_diff_hours: 4.0,
  };
  const nd = calculateNightDifferential(attendanceND, rates);
  assert(nd.amount === 218.39, 'Night differential at 10%', `Got ${nd.amount}, expected 218.39`);

  // 5. Holiday Pay (8 hrs regular holiday + 4 hrs special holiday)
  // Regular: 545.98 * 8 * 1.00 = 4367.84
  // Special: 545.98 * 4 * 0.30 = 655.18
  // Total Holiday = 5023.02
  const attendanceHol: PayrollAttendanceInput = {
    ...attendanceStandard,
    holiday_regular_hours: 8.0,
    holiday_special_hours: 4.0,
  };
  const hol = calculateHolidayPay(attendanceHol, rates);
  assert(hol.regular_amount === 4367.84, 'Regular holiday +100% premium', `Got ${hol.regular_amount}, expected 4367.84`);
  assert(hol.special_amount === 655.18, 'Special holiday +30% premium', `Got ${hol.special_amount}, expected 655.18`);
  assert(hol.total_holiday_amount === 5023.02, 'Total holiday amount', `Got ${hol.total_holiday_amount}, expected 5023.02`);

  // 6. Rest Day Pay (8 hrs @ 130% -> +30% premium)
  // 545.98 * 8 * 0.30 = 1310.35
  const attendanceRD: PayrollAttendanceInput = {
    ...attendanceStandard,
    rest_day_hours: 8.0,
  };
  const rd = calculateRestDayPay(attendanceRD, rates);
  assert(rd.amount === 1310.35, 'Rest day work +30% premium', `Got ${rd.amount}, expected 1310.35`);

  // 7. Tardiness & Absences Deductions (15m late, 30m undertime, 1 day absent)
  // Minute rate = 545.98 / 60 = 9.0997
  // Late deduction = 15 * 9.0997 = 136.50
  // Undertime deduction = 30 * 9.0997 = 272.99
  // Absence deduction = 1 * 4367.82 = 4367.82
  // Total deductions = 4777.31
  const attendanceDeductionsInput: PayrollAttendanceInput = {
    ...attendanceStandard,
    late_minutes: 15,
    undertime_minutes: 30,
    absent_days: 1.0,
  };
  const deductionsResult = calculateAttendanceDeductions(employee, attendanceDeductionsInput, rates);
  assert(deductionsResult.late_deduction === 136.50, 'Late deduction for 15 mins', `Got ${deductionsResult.late_deduction}, expected 136.50`);
  assert(deductionsResult.undertime_deduction === 272.99, 'Undertime deduction for 30 mins', `Got ${deductionsResult.undertime_deduction}, expected 272.99`);
  assert(deductionsResult.absence_deduction === 4367.82, 'Absence deduction for 1 day', `Got ${deductionsResult.absence_deduction}, expected 4367.82`);
  assert(deductionsResult.total_attendance_deductions === 4777.31, 'Total attendance deductions', `Got ${deductionsResult.total_attendance_deductions}, expected 4777.31`);

  // 8. Full Calculation Engine Orchestrator
  const fullResult = calculatePayroll({
    employee,
    attendance: {
      days_worked: 11,
      regular_hours: 88,
      overtime_hours: 8.5,
      night_diff_hours: 4.0,
      late_minutes: 15,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 0,
      holiday_special_hours: 0,
      rest_day_hours: 0,
    },
    allowances: [{ code: 'TECH', name: 'Internet / Tech Allowance', amount: 2000 }],
    bonuses: [{ code: 'PERF', name: 'Performance Bonus', amount: 5000 }],
    deductions: [{ code: 'LOAN', name: 'Company SSS Loan Amortization', amount: 1500 }],
    includeStatutory: false,
  });

  // Gross Pay = 47,500 (Basic) + 5,801.04 (OT) + 218.39 (ND) + 2,000 (Allowances) + 5,000 (Bonus) = 60,519.43
  assert(fullResult.gross_pay === 60519.43, 'Gross Pay calculation in Engine', `Got ${fullResult.gross_pay}, expected 60519.43`);

  // Total Deductions = 136.50 (Late) + 1,500 (Loan) = 1636.50
  assert(fullResult.total_deductions === 1636.50, 'Total Deductions in Engine (Base Engine)', `Got ${fullResult.total_deductions}, expected 1636.50`);

  // Net Pay = 60,519.43 - 1,636.50 = 58,882.93
  assert(fullResult.net_pay === 58882.93, 'Net Pay in Engine (Base Engine)', `Got ${fullResult.net_pay}, expected 58882.93`);

  // 9. Full Engine with Phase 11 Statutory Deductions Enabled
  const statutoryResult = calculatePayroll({
    employee,
    attendance: {
      days_worked: 11,
      regular_hours: 88,
      overtime_hours: 8.5,
      night_diff_hours: 4.0,
      late_minutes: 15,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 0,
      holiday_special_hours: 0,
      rest_day_hours: 0,
    },
    allowances: [{ code: 'TECH', name: 'Internet / Tech Allowance', amount: 2000 }],
    bonuses: [{ code: 'PERF', name: 'Performance Bonus', amount: 5000 }],
    deductions: [{ code: 'LOAN', name: 'Company SSS Loan Amortization', amount: 1500 }],
    includeStatutory: true,
  });

  assert(statutoryResult.statutory_deductions !== undefined, 'Statutory deductions present when enabled');
  assert(statutoryResult.total_deductions > fullResult.total_deductions, 'Total deductions reflect statutory deductions');
  assert(statutoryResult.net_pay < fullResult.net_pay, 'Net pay reflects statutory deductions');

  return { passed, failed, results };
}
