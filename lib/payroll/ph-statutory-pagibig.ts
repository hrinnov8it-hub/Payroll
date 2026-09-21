import { PagIbigContributionResult } from '@/types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Home Development Mutual Fund (Pag-IBIG / HDMF) Contribution Calculation
 * In compliance with Republic Act No. 9679 (Home Development Mutual Fund Law of 2009)
 * and HDMF Circular No. 460.
 *
 * Current Statutory Parameters:
 * - Monthly Compensation ≤ ₱1,500: EE 1.0%, ER 2.0%
 * - Monthly Compensation > ₱1,500: EE 2.0%, ER 2.0%
 * - Maximum Statutory Compensation Cap: ₱10,000.00
 * - Maximum Mandatory EE Monthly Contribution: ₱200.00 (₱100.00 per semi-monthly cutoff)
 * - Mandatory ER Matching Contribution: ₱200.00 (₱100.00 per semi-monthly cutoff)
 */

export const PAGIBIG_SALARY_CAP = 10000.0;

export function calculatePagIbigContribution(
  monthlySalary: number,
  isSemiMonthly = true,
  voluntaryAdditionalEE = 0
): PagIbigContributionResult {
  const salary = Math.max(0, monthlySalary);
  const coveredSalary = Math.min(salary, PAGIBIG_SALARY_CAP);

  const eeRate = coveredSalary <= 1500 ? 0.01 : 0.02;
  const erRate = 0.02;

  const mandatoryEE = roundToTwoDecimals(coveredSalary * eeRate);
  const mandatoryER = roundToTwoDecimals(coveredSalary * erRate);

  const totalEE = roundToTwoDecimals(mandatoryEE + Math.max(0, voluntaryAdditionalEE));
  const totalER = mandatoryER;
  const totalMonthly = roundToTwoDecimals(totalEE + totalER);

  const divisor = isSemiMonthly ? 2 : 1;
  const employeeCutoff = roundToTwoDecimals(totalEE / divisor);
  const employerCutoff = roundToTwoDecimals(totalER / divisor);

  return {
    monthly_basic_salary: salary,
    employee_rate: eeRate,
    employer_rate: erRate,
    total_monthly: totalMonthly,
    employee_monthly: totalEE,
    employer_monthly: totalER,
    employee_cutoff: employeeCutoff,
    employer_cutoff: employerCutoff,
  };
}
