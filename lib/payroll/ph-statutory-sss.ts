import { SSSContributionResult } from '@/types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Philippine Social Security System (SSS) Contribution Table & Calculation
 * In compliance with Republic Act No. 11199 (Social Security Act of 2018).
 *
 * Current Statutory Parameters:
 * - Total contribution rate: 14.0%
 * - Employee Share (EE): 4.5%
 * - Employer Share (ER): 9.5%
 * - Minimum Monthly Salary Credit (MSC): ₱4,000
 * - Maximum Regular MSC: ₱20,000
 * - Maximum Combined MSC (including WISP): ₱30,000
 * - EC (Employees' Compensation) Fund: ₱10 (< ₱15k MSC) or ₱30 (≥ ₱15k MSC) paid by ER.
 */

export interface SSSBracket {
  minSalary: number;
  maxSalary: number;
  msc: number;
  regularMsc: number;
  wispMsc: number;
  regularEE: number;
  regularER: number;
  wispEE: number;
  wispER: number;
  ecER: number;
}

/**
 * Computes Monthly Salary Credit (MSC) based on monthly compensation
 */
export function getMonthlySalaryCredit(monthlySalary: number): { regularMsc: number; wispMsc: number; totalMsc: number } {
  const salary = Math.max(0, monthlySalary);

  if (salary < 4250) {
    return { regularMsc: 4000, wispMsc: 0, totalMsc: 4000 };
  }

  // Bracket step is 500: range [MSC - 250, MSC + 250)
  let totalMsc = Math.min(30000, Math.floor((salary + 250) / 500) * 500);
  if (totalMsc < 4000) totalMsc = 4000;
  if (totalMsc > 30000) totalMsc = 30000;

  const regularMsc = Math.min(20000, totalMsc);
  const wispMsc = Math.max(0, totalMsc - 20000);

  return { regularMsc, wispMsc, totalMsc };
}

/**
 * Calculates official SSS contribution for an employee based on monthly compensation
 */
export function calculateSSSContribution(monthlySalary: number, isSemiMonthly = true): SSSContributionResult {
  const { regularMsc, wispMsc, totalMsc } = getMonthlySalaryCredit(monthlySalary);

  // Regular SS (4.5% EE, 9.5% ER on regular MSC up to ₱20k)
  const regularEE = roundToTwoDecimals(regularMsc * 0.045);
  const regularER = roundToTwoDecimals(regularMsc * 0.095);

  // WISP (4.5% EE, 9.5% ER on excess MSC ₱20,001 - ₱30,000)
  const wispEE = roundToTwoDecimals(wispMsc * 0.045);
  const wispER = roundToTwoDecimals(wispMsc * 0.095);

  // EC Contribution (Employer only)
  const ecER = totalMsc >= 15000 ? 30.0 : 10.0;

  const totalEE = roundToTwoDecimals(regularEE + wispEE);
  const totalER = roundToTwoDecimals(regularER + wispER + ecER);

  const divisor = isSemiMonthly ? 2 : 1;
  const cutoffEE = roundToTwoDecimals(totalEE / divisor);
  const cutoffER = roundToTwoDecimals(totalER / divisor);

  return {
    monthly_salary_credit: totalMsc,
    regular_ss_employee: regularEE,
    regular_ss_employer: regularER,
    wisp_employee: wispEE,
    wisp_employer: wispER,
    ec_employer: ecER,
    total_employee_monthly: totalEE,
    total_employer_monthly: totalER,
    total_employee_cutoff: cutoffEE,
    total_employer_cutoff: cutoffER,
  };
}
