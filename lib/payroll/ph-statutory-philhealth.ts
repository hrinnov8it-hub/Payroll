import { PhilHealthContributionResult } from '@/types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Philippine Health Insurance Corporation (PhilHealth) Contribution Calculation
 * In compliance with Republic Act No. 11223 (Universal Health Care Act).
 *
 * Current Statutory Parameters:
 * - Premium Rate: 5.0%
 * - Employee Share: 2.5% (50% of total)
 * - Employer Share: 2.5% (50% of total)
 * - Monthly Income Floor: ₱10,000.00 (Minimum Premium: ₱500.00; EE: ₱250.00, ER: ₱250.00)
 * - Monthly Income Ceiling: ₱100,000.00 (Maximum Premium: ₱5,000.00; EE: ₱2,500.00, ER: ₱2,500.00)
 */

export const PHILHEALTH_PREMIUM_RATE = 0.05;
export const PHILHEALTH_INCOME_FLOOR = 10000.0;
export const PHILHEALTH_INCOME_CEILING = 100000.0;

export function calculatePhilHealthContribution(
  monthlySalary: number,
  isSemiMonthly = true
): PhilHealthContributionResult {
  const salary = Math.max(0, monthlySalary);

  // Apply income floor and ceiling
  let coveredSalary = salary;
  if (coveredSalary < PHILHEALTH_INCOME_FLOOR) {
    coveredSalary = PHILHEALTH_INCOME_FLOOR;
  } else if (coveredSalary > PHILHEALTH_INCOME_CEILING) {
    coveredSalary = PHILHEALTH_INCOME_CEILING;
  }

  const totalMonthlyPremium = roundToTwoDecimals(coveredSalary * PHILHEALTH_PREMIUM_RATE);
  const employeeMonthly = roundToTwoDecimals(totalMonthlyPremium / 2);
  const employerMonthly = roundToTwoDecimals(totalMonthlyPremium - employeeMonthly);

  const divisor = isSemiMonthly ? 2 : 1;
  const employeeCutoff = roundToTwoDecimals(employeeMonthly / divisor);
  const employerCutoff = roundToTwoDecimals(employerMonthly / divisor);

  return {
    monthly_basic_salary: salary,
    premium_rate: PHILHEALTH_PREMIUM_RATE,
    total_monthly_premium: totalMonthlyPremium,
    employee_monthly: employeeMonthly,
    employer_monthly: employerMonthly,
    employee_cutoff: employeeCutoff,
    employer_cutoff: employerCutoff,
  };
}
