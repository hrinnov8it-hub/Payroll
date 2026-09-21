import type { PayrollEmployeeInput, RateBreakdown, PayrollSettings } from '../../types/payroll';

/**
 * Standard default constants for Philippine labor law (DOLE Handbook):
 * - Standard working days per year for 5-day workweek (Mon-Fri) = 261 days
 * - Standard working hours per day = 8 hours
 */
export const DEFAULT_WORKING_DAYS_PER_YEAR = 261;
export const DEFAULT_HOURS_PER_DAY = 8;

/**
 * Calculate standard daily, hourly, and minute rates for an employee
 */
export function calculateRates(
  employee: PayrollEmployeeInput,
  settings?: Partial<PayrollSettings>
): RateBreakdown {
  const workingDaysPerYear =
    settings?.standard_working_days_per_year || DEFAULT_WORKING_DAYS_PER_YEAR;
  const hoursPerDay = settings?.standard_hours_per_day || DEFAULT_HOURS_PER_DAY;

  let dailyRate = 0;
  let hourlyRate = 0;

  switch (employee.pay_type) {
    case 'monthly': {
      // DOLE Formula: Daily Rate = (Monthly Rate × 12) / Total Working Days in a Year
      dailyRate = (employee.basic_salary * 12) / workingDaysPerYear;
      hourlyRate = dailyRate / hoursPerDay;
      break;
    }
    case 'daily': {
      dailyRate = employee.basic_salary;
      hourlyRate = dailyRate / hoursPerDay;
      break;
    }
    case 'hourly': {
      hourlyRate = employee.hourly_rate || employee.basic_salary;
      dailyRate = hourlyRate * hoursPerDay;
      break;
    }
    default: {
      dailyRate = (employee.basic_salary * 12) / workingDaysPerYear;
      hourlyRate = dailyRate / hoursPerDay;
    }
  }

  const roundedDailyRate = roundToTwoDecimals(dailyRate);
  const roundedHourlyRate = roundToTwoDecimals(hourlyRate);
  const minuteRate = roundedHourlyRate / 60;

  return {
    daily_rate: roundedDailyRate,
    hourly_rate: roundedHourlyRate,
    minute_rate: roundToFourDecimals(minuteRate),
  };
}

export function roundToTwoDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function roundToFourDecimals(val: number): number {
  return Math.round((val + Number.EPSILON) * 10000) / 10000;
}
