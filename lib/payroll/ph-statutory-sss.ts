import { SSSContributionResult } from '@/types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Philippine Social Security System (SSS) Contribution Table & Calculation
 * In compliance with Republic Act No. 11199 (Social Security Act of 2018).
 *
 * Current Statutory Parameters:
 * Effective January 2025, SSS Circular 2024-006 (business employers/employees):
 * https://www.sss.gov.ph/wp-content/uploads/2024/12/CI-2024-006-Publication.pdf
 * - Total contribution rate: 15.0%
 * - Employee Share (EE): 5.0%
 * - Employer Share (ER): 10.0%
 * - Minimum Monthly Salary Credit (MSC): ₱5,000
 * - Maximum Regular MSC: ₱20,000
 * - Maximum Combined MSC (including mandatory provident fund): ₱35,000
 * - EC (Employees' Compensation) Fund: ₱10 (< ₱15k MSC) or ₱30 (≥ ₱15k MSC) paid by ER.
 */

export const SSS_EMPLOYEE_RATE = 0.05;
export const SSS_EMPLOYER_RATE = 0.10;
export const SSS_MIN_MSC = 5000;
export const SSS_MAX_MSC = 35000;
export const SSS_REGULAR_MSC_CAP = 20000;

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

  // Bracket step is 500: range [MSC - 250, MSC + 250)
  const totalMsc = Math.max(SSS_MIN_MSC, Math.min(SSS_MAX_MSC, Math.floor((salary + 250) / 500) * 500));

  const regularMsc = Math.min(SSS_REGULAR_MSC_CAP, totalMsc);
  const wispMsc = Math.max(0, totalMsc - SSS_REGULAR_MSC_CAP);

  return { regularMsc, wispMsc, totalMsc };
}

/**
 * Calculates official SSS contribution for an employee based on monthly compensation
 */
export function calculateSSSContribution(monthlySalary: number, isSemiMonthly = true): SSSContributionResult {
  const { regularMsc, wispMsc, totalMsc } = getMonthlySalaryCredit(monthlySalary);

  // Regular SS on MSC up to ₱20,000.
  const regularEE = roundToTwoDecimals(regularMsc * SSS_EMPLOYEE_RATE);
  const regularER = roundToTwoDecimals(regularMsc * SSS_EMPLOYER_RATE);

  // Mandatory provident fund on MSC above ₱20,000, up to ₱35,000.
  const wispEE = roundToTwoDecimals(wispMsc * SSS_EMPLOYEE_RATE);
  const wispER = roundToTwoDecimals(wispMsc * SSS_EMPLOYER_RATE);

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
