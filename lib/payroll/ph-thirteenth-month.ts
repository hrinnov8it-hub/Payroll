import { roundToTwoDecimals } from './calculate-rates';

/**
 * Philippine 13th Month Pay Calculation & Compliance
 * In compliance with Presidential Decree No. 851 and DOLE Guidelines.
 *
 * Statutory Rules:
 * - Mandatory for all rank-and-file employees who have worked for at least 1 month.
 * - Formula: Total Basic Salary earned within the calendar year / 12 months.
 * - Tax Exemption Threshold: ₱90,000.00 under Republic Act No. 10963 (TRAIN Law).
 *   Amounts in excess of ₱90,000 are subject to regular withholding tax.
 */

export const THIRTEENTH_MONTH_TAX_EXEMPT_CAP = 90000.0;

export interface ThirteenthMonthCalculationResult {
  total_basic_salary_earned: number;
  months_worked: number;
  gross_thirteenth_month: number;
  tax_exempt_portion: number;
  taxable_portion: number;
  cutoff_accrual: number;
}

/**
 * Calculates 13th month pay based on total basic salary earned in the calendar year
 */
export function calculateThirteenthMonthPay(
  totalBasicSalaryEarned: number,
  monthsWorked = 12
): ThirteenthMonthCalculationResult {
  const earned = Math.max(0, totalBasicSalaryEarned);
  const gross = roundToTwoDecimals(earned / 12);

  const taxExemptPortion = Math.min(gross, THIRTEENTH_MONTH_TAX_EXEMPT_CAP);
  const taxablePortion = roundToTwoDecimals(Math.max(0, gross - THIRTEENTH_MONTH_TAX_EXEMPT_CAP));

  // Accrual per semi-monthly cutoff (1/24th of annual or 1/2 of monthly 13th month allocation)
  const cutoffAccrual = roundToTwoDecimals(gross / (monthsWorked * 2 || 24));

  return {
    total_basic_salary_earned: earned,
    months_worked: monthsWorked,
    gross_thirteenth_month: gross,
    tax_exempt_portion: taxExemptPortion,
    taxable_portion: taxablePortion,
    cutoff_accrual: cutoffAccrual,
  };
}

/**
 * Calculates pro-rated 13th month pay for resigned, terminated, or newly hired employees
 */
export function calculateProratedThirteenthMonth(
  monthlyBasicSalary: number,
  monthsWorked: number
): ThirteenthMonthCalculationResult {
  const months = Math.min(12, Math.max(0, monthsWorked));
  const totalEarned = roundToTwoDecimals(monthlyBasicSalary * months);
  return calculateThirteenthMonthPay(totalEarned, months);
}
