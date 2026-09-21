import type {
  PayrollCalculationInput,
  PayrollCalculationResult,
  StatutoryDeductionsBreakdown,
} from '../../types/payroll';
import { calculateRates, roundToTwoDecimals } from './calculate-rates';
import { calculateBasicPay } from './calculate-basic-pay';
import { calculateOvertime } from './calculate-overtime';
import { calculateNightDifferential } from './calculate-night-differential';
import { calculateHolidayPay } from './calculate-holiday-pay';
import { calculateRestDayPay } from './calculate-rest-day-pay';
import { calculateAttendanceDeductions } from './calculate-deductions';
import { calculateGrossPay } from './calculate-gross-pay';
import { calculateNetPay } from './calculate-net-pay';
import { calculateSSSContribution } from './ph-statutory-sss';
import { calculatePhilHealthContribution } from './ph-statutory-philhealth';
import { calculatePagIbigContribution } from './ph-statutory-pagibig';
import { calculateWithholdingTax } from './ph-tax-withholding';

/**
 * Innov8IT Payroll Centralized Calculation Engine (Phase 7 & Phase 11 Compliant)
 *
 * Deterministic, immutable calculation orchestrator for Philippine semi-monthly payroll.
 * Computes:
 * - Daily, hourly, minute rate breakdown
 * - Cutoff basic pay
 * - Overtime pay (125% regular wage)
 * - Night differential (10% premium for 10PM - 6AM)
 * - Regular holiday (+100% premium) & Special holiday (+30% premium)
 * - Rest day pay (+30% premium)
 * - Allowances & Bonuses
 * - Gross Pay
 * - Tardiness (late & undertime) and absence deductions
 * - Philippine Statutory Deductions (Phase 11):
 *   * SSS (RA 11199 EE 4.5%, ER 9.5%, MSC, WISP, EC Fund)
 *   * PhilHealth (RA 11223 UHC EE 2.5%, ER 2.5%, Floor 10k, Ceiling 100k)
 *   * Pag-IBIG (RA 9679 & Circular 460 EE 2.0%, ER 2.0%, Cap 10k)
 *   * BIR Withholding Tax (RA 10963 TRAIN Law Revised Withholding Tax tables)
 * - Other deductions
 * - Total Deductions
 * - Net Pay
 */
export function calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
  const {
    employee,
    attendance,
    settings,
    allowances = [],
    bonuses = [],
    deductions = [],
    includeStatutory = true,
    voluntaryPagIbigEE = 0,
  } = input;

  // 1. Calculate rate breakdown
  const rates = calculateRates(employee, settings);

  // 2. Calculate basic pay
  const basicPay = calculateBasicPay(employee, attendance, rates);

  // 3. Calculate overtime
  const overtime = calculateOvertime(attendance, rates, settings);

  // 4. Calculate night shift differential
  const nightDiff = calculateNightDifferential(attendance, rates, settings);

  // 5. Calculate holiday pay premiums
  const holiday = calculateHolidayPay(attendance, rates, settings);

  // 6. Calculate rest day pay premium
  const restDay = calculateRestDayPay(attendance, rates, settings);

  // 7. Calculate gross pay
  const grossPayResult = calculateGrossPay({
    basicPay,
    overtime,
    nightDiff,
    holiday,
    restDay,
    allowances,
    bonuses,
  });

  // 8. Calculate attendance deductions (late, undertime, absences)
  const attendanceDeductions = calculateAttendanceDeductions(
    employee,
    attendance,
    rates,
    settings
  );

  // 9. Calculate Philippine Statutory Deductions (Phase 11)
  let statutoryDeductions: StatutoryDeductionsBreakdown | undefined = undefined;

  if (includeStatutory) {
    // Determine monthly equivalent salary for statutory bracket lookups
    let monthlySalary = employee.basic_salary;
    if (employee.pay_type === 'daily') {
      const workDays = settings?.standard_working_days_per_year || 261;
      monthlySalary = roundToTwoDecimals((rates.daily_rate * workDays) / 12);
    } else if (employee.pay_type === 'hourly') {
      const workDays = settings?.standard_working_days_per_year || 261;
      const hoursPerDay = settings?.standard_hours_per_day || 8;
      monthlySalary = roundToTwoDecimals((rates.hourly_rate * hoursPerDay * workDays) / 12);
    }

    const isSemiMonthly = settings?.pay_frequency ? settings.pay_frequency === 'semi_monthly' : true;

    // SSS, PhilHealth, Pag-IBIG statutory contributions
    const sss = calculateSSSContribution(monthlySalary, isSemiMonthly);
    const philhealth = calculatePhilHealthContribution(monthlySalary, isSemiMonthly);
    const pagibig = calculatePagIbigContribution(monthlySalary, isSemiMonthly, voluntaryPagIbigEE);

    // Taxable Income Calculation (BIR Rules):
    // Taxable Income = Gross Pay - Attendance Deductions - Mandatory EE Contributions
    const mandatoryEEContributions = roundToTwoDecimals(
      sss.total_employee_cutoff + philhealth.employee_cutoff + pagibig.employee_cutoff
    );

    const taxableIncome = Math.max(
      0,
      roundToTwoDecimals(
        grossPayResult.gross_pay -
          attendanceDeductions.total_attendance_deductions -
          mandatoryEEContributions
      )
    );

    const withholdingTax = calculateWithholdingTax(taxableIncome, isSemiMonthly);

    const totalStatutoryEmployee = roundToTwoDecimals(
      mandatoryEEContributions + withholdingTax.tax_amount
    );

    const totalEmployerContributions = roundToTwoDecimals(
      sss.total_employer_cutoff + philhealth.employer_cutoff + pagibig.employer_cutoff
    );

    statutoryDeductions = {
      sss,
      philhealth,
      pagibig,
      withholding_tax: withholdingTax,
      total_statutory_deductions: totalStatutoryEmployee,
      total_employer_contributions: totalEmployerContributions,
    };
  }

  // 10. Calculate net pay and total deductions
  const netPayResult = calculateNetPay({
    grossPay: grossPayResult.gross_pay,
    attendanceDeductions,
    statutoryDeductions,
    otherDeductions: deductions,
  });

  return {
    employee_id: employee.id,
    rates,
    basic_pay: basicPay,
    overtime,
    night_diff: nightDiff,
    holiday,
    rest_day: restDay,
    total_allowances: grossPayResult.total_allowances,
    allowances_list: allowances,
    total_bonuses: grossPayResult.total_bonuses,
    bonuses_list: bonuses,
    gross_pay: grossPayResult.gross_pay,
    attendance_deductions: attendanceDeductions,
    statutory_deductions: statutoryDeductions,
    other_deductions: netPayResult.other_deductions_total,
    other_deductions_list: deductions,
    total_deductions: netPayResult.total_deductions,
    net_pay: netPayResult.net_pay,
    calculated_at: new Date().toISOString(),
  };
}
