/**
 * Innov8IT Payroll - Phase 11 Philippine Payroll Rules Compliance Test Suite
 *
 * Validates:
 * 1. SSS Contribution Table & WISP (RA 11199)
 * 2. PhilHealth 5% UHC Contribution (RA 11223)
 * 3. Pag-IBIG 2% Mandatory & Cap Rules (RA 9679 & Circular 460)
 * 4. BIR Revised Withholding Tax under TRAIN Law (RA 10963)
 * 5. DOLE Overtime, Holiday, Rest Day, and Night Diff multipliers
 * 6. 13th Month Pay Calculation under PD 851
 * 7. End-to-end Payroll Engine Statutory Deductions Integration
 */

import { calculateSSSContribution, getMonthlySalaryCredit } from '../ph-statutory-sss';
import {
  calculatePhilHealthContribution,
  PHILHEALTH_INCOME_FLOOR,
  PHILHEALTH_INCOME_CEILING,
} from '../ph-statutory-philhealth';
import { calculatePagIbigContribution, PAGIBIG_SALARY_CAP } from '../ph-statutory-pagibig';
import { calculateWithholdingTax } from '../ph-tax-withholding';
import { DOLE_RATES, calculateDOLEPremium, calculateDOLENightDiff } from '../ph-overtime-rules';
import { calculateThirteenthMonthPay, calculateProratedThirteenthMonth } from '../ph-thirteenth-month';
import { calculatePayroll } from '../engine';
import { PayrollEmployeeInput, PayrollAttendanceInput } from '../../../types/payroll';

export function runPhilippineComplianceTests(): { passed: number; failed: number; results: string[] } {
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

  // ============================================================================
  // 1. SSS & WISP Contribution Tests (RA 11199)
  // ============================================================================
  // Test 1a: Salary ₱25,000 (Crosses into WISP above ₱20,000)
  const sss25k = calculateSSSContribution(25000, true);
  assert(sss25k.monthly_salary_credit === 25000, 'SSS MSC for ₱25,000 salary', `Got ${sss25k.monthly_salary_credit}`);
  assert(sss25k.regular_ss_employee === 900.0, 'SSS Regular EE share (4.5% of ₱20k = ₱900)', `Got ${sss25k.regular_ss_employee}`);
  assert(sss25k.regular_ss_employer === 1900.0, 'SSS Regular ER share (9.5% of ₱20k = ₱1,900)', `Got ${sss25k.regular_ss_employer}`);
  assert(sss25k.wisp_employee === 225.0, 'SSS WISP EE share (4.5% of ₱5k excess = ₱225)', `Got ${sss25k.wisp_employee}`);
  assert(sss25k.wisp_employer === 475.0, 'SSS WISP ER share (9.5% of ₱5k excess = ₱475)', `Got ${sss25k.wisp_employer}`);
  assert(sss25k.ec_employer === 30.0, 'SSS EC ER share (₱30 for MSC >= ₱15,000)', `Got ${sss25k.ec_employer}`);
  assert(sss25k.total_employee_monthly === 1125.0, 'SSS Total EE Monthly = ₱1,125.00', `Got ${sss25k.total_employee_monthly}`);
  assert(sss25k.total_employee_cutoff === 562.5, 'SSS Semi-monthly EE Cutoff = ₱562.50', `Got ${sss25k.total_employee_cutoff}`);

  // Test 1b: Salary ₱95,000 (Maximum MSC Cap ₱30,000)
  const sss95k = calculateSSSContribution(95000, true);
  assert(sss95k.monthly_salary_credit === 30000, 'SSS Max MSC Cap ₱30,000', `Got ${sss95k.monthly_salary_credit}`);
  assert(sss95k.total_employee_monthly === 1350.0, 'SSS Max EE Monthly = ₱1,350.00', `Got ${sss95k.total_employee_monthly}`);
  assert(sss95k.total_employee_cutoff === 675.0, 'SSS Max EE Cutoff = ₱675.00', `Got ${sss95k.total_employee_cutoff}`);

  // ============================================================================
  // 2. PhilHealth UHC Contribution Tests (RA 11223)
  // ============================================================================
  // Test 2a: Salary ₱30,000 (5% total: 2.5% EE, 2.5% ER)
  const phic30k = calculatePhilHealthContribution(30000, true);
  assert(phic30k.total_monthly_premium === 1500.0, 'PhilHealth 5% Premium for ₱30k = ₱1,500', `Got ${phic30k.total_monthly_premium}`);
  assert(phic30k.employee_monthly === 750.0, 'PhilHealth EE Monthly = ₱750.00', `Got ${phic30k.employee_monthly}`);
  assert(phic30k.employer_monthly === 750.0, 'PhilHealth ER Monthly = ₱750.00', `Got ${phic30k.employer_monthly}`);
  assert(phic30k.employee_cutoff === 375.0, 'PhilHealth EE Cutoff = ₱375.00', `Got ${phic30k.employee_cutoff}`);

  // Test 2b: Floor check (< ₱10,000)
  const phicLow = calculatePhilHealthContribution(8000, true);
  assert(phicLow.total_monthly_premium === 500.0, 'PhilHealth Minimum Floor Premium = ₱500.00', `Got ${phicLow.total_monthly_premium}`);
  assert(phicLow.employee_cutoff === 125.0, 'PhilHealth Floor EE Cutoff = ₱125.00', `Got ${phicLow.employee_cutoff}`);

  // Test 2c: Ceiling check (> ₱100,000)
  const phicHigh = calculatePhilHealthContribution(150000, true);
  assert(phicHigh.total_monthly_premium === 5000.0, 'PhilHealth Maximum Ceiling Premium = ₱5,000.00', `Got ${phicHigh.total_monthly_premium}`);
  assert(phicHigh.employee_cutoff === 1250.0, 'PhilHealth Ceiling EE Cutoff = ₱1,250.00', `Got ${phicHigh.employee_cutoff}`);

  // ============================================================================
  // 3. Pag-IBIG / HDMF Contribution Tests (RA 9679 & Circular 460)
  // ============================================================================
  // Test 3a: Standard Salary >= ₱10,000 Cap
  const hdmfStd = calculatePagIbigContribution(45000, true);
  assert(hdmfStd.employee_monthly === 200.0, 'Pag-IBIG Mandatory EE Monthly = ₱200.00', `Got ${hdmfStd.employee_monthly}`);
  assert(hdmfStd.employer_monthly === 200.0, 'Pag-IBIG Mandatory ER Monthly = ₱200.00', `Got ${hdmfStd.employer_monthly}`);
  assert(hdmfStd.employee_cutoff === 100.0, 'Pag-IBIG EE Cutoff = ₱100.00', `Got ${hdmfStd.employee_cutoff}`);

  // Test 3b: Voluntary Additional Contribution (₱300/mo)
  const hdmfVol = calculatePagIbigContribution(45000, true, 300);
  assert(hdmfVol.employee_monthly === 500.0, 'Pag-IBIG EE with ₱300 voluntary = ₱500.00', `Got ${hdmfVol.employee_monthly}`);
  assert(hdmfVol.employee_cutoff === 250.0, 'Pag-IBIG EE Cutoff with voluntary = ₱250.00', `Got ${hdmfVol.employee_cutoff}`);

  // ============================================================================
  // 4. BIR Revised Withholding Tax Tests (RA 10963 TRAIN Law)
  // ============================================================================
  // Test 4a: Exempt (Taxable Income <= ₱10,417 semi-monthly)
  const taxExempt = calculateWithholdingTax(10000, true);
  assert(taxExempt.tax_amount === 0, 'BIR Withholding Tax Exempt below ₱10,417', `Got ${taxExempt.tax_amount}`);

  // Test 4b: Bracket 2 (₱10,417 - ₱16,667 @ 15% on excess)
  // Taxable = ₱15,000 -> excess = 4,583 -> 4,583 * 0.15 = 687.45
  const taxB2 = calculateWithholdingTax(15000, true);
  assert(taxB2.tax_amount === 687.45, 'BIR Bracket 2 (15% excess over ₱10,417)', `Got ${taxB2.tax_amount}`);

  // Test 4c: Bracket 3 (₱16,667 - ₱33,333 @ ₱937.50 + 20% on excess)
  // Taxable = ₱25,000 -> excess = 8,333 -> 937.50 + 8,333 * 0.20 = 937.50 + 1666.60 = 2604.10
  const taxB3 = calculateWithholdingTax(25000, true);
  assert(taxB3.tax_amount === 2604.1, 'BIR Bracket 3 (₱937.50 + 20% excess over ₱16,667)', `Got ${taxB3.tax_amount}`);

  // ============================================================================
  // 5. DOLE Overtime & Holiday Rules Tests
  // ============================================================================
  assert(DOLE_RATES.REGULAR_OVERTIME === 1.25, 'DOLE Regular Overtime = 125%');
  assert(DOLE_RATES.REST_DAY_FIRST_8H === 1.30, 'DOLE Rest Day First 8 Hours = 130%');
  assert(DOLE_RATES.REST_DAY_OVERTIME === 1.69, 'DOLE Rest Day Overtime = 169%');
  assert(DOLE_RATES.SPECIAL_HOLIDAY_FIRST_8H === 1.30, 'DOLE Special Holiday First 8 Hours = 130%');
  assert(DOLE_RATES.REGULAR_HOLIDAY_FIRST_8H === 2.00, 'DOLE Regular Holiday First 8 Hours = 200%');
  assert(DOLE_RATES.REGULAR_HOLIDAY_OVERTIME === 2.60, 'DOLE Regular Holiday Overtime = 260%');
  assert(DOLE_RATES.REGULAR_HOLIDAY_REST_DAY_FIRST_8H === 2.60, 'DOLE Regular Holiday on Rest Day First 8H = 260%');
  assert(DOLE_RATES.REGULAR_HOLIDAY_REST_DAY_OVERTIME === 3.38, 'DOLE Regular Holiday on Rest Day OT = 338%');

  // Test DOLE calculations
  const hourlyRate = 200.0;
  const regularOTPay = calculateDOLEPremium(hourlyRate, 2.0, DOLE_RATES.REGULAR_OVERTIME);
  assert(regularOTPay === 500.0, 'DOLE Regular OT Pay for 2 hours @ ₱200/hr = ₱500.00', `Got ${regularOTPay}`);

  const restDayOTPay = calculateDOLEPremium(hourlyRate, 2.0, DOLE_RATES.REST_DAY_OVERTIME);
  assert(restDayOTPay === 676.0, 'DOLE Rest Day OT Pay for 2 hours @ ₱200/hr = ₱676.00', `Got ${restDayOTPay}`);

  const nightDiffPay = calculateDOLENightDiff(hourlyRate, 4.0);
  assert(nightDiffPay === 80.0, 'DOLE Night Diff for 4 hours @ ₱200/hr = ₱80.00', `Got ${nightDiffPay}`);

  // ============================================================================
  // 6. 13th Month Pay Tests (PD 851)
  // ============================================================================
  const th13 = calculateThirteenthMonthPay(360000, 12);
  assert(th13.gross_thirteenth_month === 30000.0, '13th Month Gross (₱360k / 12) = ₱30,000', `Got ${th13.gross_thirteenth_month}`);
  assert(th13.tax_exempt_portion === 30000.0, '13th Month Tax-Exempt under ₱90k cap', `Got ${th13.tax_exempt_portion}`);
  assert(th13.taxable_portion === 0.0, '13th Month Taxable Portion = ₱0.00', `Got ${th13.taxable_portion}`);

  const prorated13 = calculateProratedThirteenthMonth(30000, 6);
  assert(prorated13.gross_thirteenth_month === 15000.0, 'Prorated 13th Month for 6 months service = ₱15,000', `Got ${prorated13.gross_thirteenth_month}`);

  // ============================================================================
  // 7. Full Payroll Engine End-to-End Statutory Deductions Integration
  // ============================================================================
  const employee: PayrollEmployeeInput = {
    id: 'emp-ph-001',
    employee_number: 'IN8-PH-001',
    first_name: 'Maria',
    last_name: 'Santos',
    basic_salary: 50000,
    pay_type: 'monthly',
  };

  const attendance: PayrollAttendanceInput = {
    days_worked: 11,
    regular_hours: 88,
    overtime_hours: 4.0,
    night_diff_hours: 0,
    holiday_regular_hours: 0,
    holiday_special_hours: 0,
    rest_day_hours: 0,
    late_minutes: 0,
    undertime_minutes: 0,
    absent_days: 0,
  };

  const engineResult = calculatePayroll({
    employee,
    attendance,
    includeStatutory: true,
  });

  assert(engineResult.statutory_deductions !== undefined, 'Statutory deductions present in engine result');
  if (engineResult.statutory_deductions) {
    const stat = engineResult.statutory_deductions;
    // Basic pay = 25,000.00
    // SSS on 50k (MSC 30k capped) -> EE cutoff = 675.00
    assert(stat.sss.total_employee_cutoff === 675.0, 'Engine SSS EE Cutoff = ₱675.00', `Got ${stat.sss.total_employee_cutoff}`);
    // PhilHealth on 50k -> EE monthly = 1,250.00 -> EE cutoff = 625.00
    assert(stat.philhealth.employee_cutoff === 625.0, 'Engine PhilHealth EE Cutoff = ₱625.00', `Got ${stat.philhealth.employee_cutoff}`);
    // Pag-IBIG on 50k (cap 10k) -> EE cutoff = 100.00
    assert(stat.pagibig.employee_cutoff === 100.0, 'Engine Pag-IBIG EE Cutoff = ₱100.00', `Got ${stat.pagibig.employee_cutoff}`);

    // Total mandatory contributions = 675 + 625 + 100 = 1,400.00
    // Taxable Income = Gross Pay - Mandatory Contributions
    // Gross Pay = Basic (25,000) + OT (4 hrs * 287.36 * 1.25 = 1436.80) = 26,436.80
    // Taxable Income = 26,436.80 - 1,400.00 = 25,036.80
    // Tax on 25,036.80 (Bracket 3: ₱937.50 + 20% on (25,036.80 - 16,667)) = 937.50 + 1673.96 = 2,611.46
    assert(stat.withholding_tax.tax_amount > 0, 'Engine BIR Withholding Tax calculated', `Got ${stat.withholding_tax.tax_amount}`);
    assert(stat.total_statutory_deductions > 0, 'Total Statutory Deductions calculated', `Got ${stat.total_statutory_deductions}`);

    // Verify Net Pay = Gross Pay - Total Deductions
    const expectedNet = Number((engineResult.gross_pay - engineResult.total_deductions).toFixed(2));
    assert(engineResult.net_pay === expectedNet, 'Engine Net Pay matches Gross - Total Deductions', `Got ${engineResult.net_pay}, expected ${expectedNet}`);
  }

  return { passed, failed, results };
}
