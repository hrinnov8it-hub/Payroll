import { roundToTwoDecimals } from './calculate-rates';

/**
 * DOLE Philippine Labor Code Compliance - Overtime, Holiday, and Premium Pay Rules
 * Articles 86, 87, 91, 93, 94 of Presidential Decree No. 442 (Labor Code of the Philippines)
 */

export const DOLE_RATES = {
  // 1. Regular Work Day
  REGULAR_WORK_DAY: 1.0,
  REGULAR_OVERTIME: 1.25, // 125% of hourly rate for work in excess of 8 hours

  // 2. Scheduled Rest Day
  REST_DAY_FIRST_8H: 1.3, // 130% of regular wage
  REST_DAY_OVERTIME: 1.69, // 130% * 130% = 169% of hourly rate

  // 3. Special Non-Working Day / Holiday
  SPECIAL_HOLIDAY_FIRST_8H: 1.3, // 130% of regular wage
  SPECIAL_HOLIDAY_OVERTIME: 1.69, // 130% * 130% = 169% of hourly rate

  // 4. Special Non-Working Day falling on Scheduled Rest Day
  SPECIAL_HOLIDAY_REST_DAY_FIRST_8H: 1.5, // 150% of regular wage
  SPECIAL_HOLIDAY_REST_DAY_OVERTIME: 1.95, // 150% * 130% = 195% of hourly rate

  // 5. Regular Holiday
  REGULAR_HOLIDAY_UNWORKED: 1.0, // 100% of regular wage if present or on leave on preceding workday
  REGULAR_HOLIDAY_FIRST_8H: 2.0, // 200% of regular wage
  REGULAR_HOLIDAY_OVERTIME: 2.6, // 200% * 130% = 260% of hourly rate

  // 6. Regular Holiday falling on Scheduled Rest Day
  REGULAR_HOLIDAY_REST_DAY_FIRST_8H: 2.6, // 200% * 130% = 260% of regular wage
  REGULAR_HOLIDAY_REST_DAY_OVERTIME: 3.38, // 260% * 130% = 338% of hourly rate

  // 7. Night Shift Differential (10:00 PM to 6:00 AM)
  NIGHT_DIFFERENTIAL_RATE: 0.1, // +10% premium on top of regular / overtime / holiday hourly rate
} as const;

export interface DOLEOvertimeItem {
  type: string;
  hours: number;
  multiplier: number;
  ratePerHour: number;
  totalPay: number;
}

export interface DOLEOvertimeBreakdown {
  items: DOLEOvertimeItem[];
  totalOvertimePay: number;
}

/**
 * Calculates DOLE-compliant premium pay for a specific workday condition and hourly rate
 */
export function calculateDOLEPremium(
  hourlyRate: number,
  hours: number,
  multiplier: number
): number {
  if (hours <= 0 || hourlyRate <= 0) return 0;
  return roundToTwoDecimals(hourlyRate * hours * multiplier);
}

/**
 * Calculates Night Differential premium on top of base or overtime hourly rate
 */
export function calculateDOLENightDiff(
  baseHourlyRate: number,
  hours: number,
  conditionMultiplier = 1.0
): number {
  if (hours <= 0 || baseHourlyRate <= 0) return 0;
  // Art. 86: Not less than ten percent (10%) of regular wage for each hour of work performed between 10:00 PM and 6:00 AM
  const effectiveRate = baseHourlyRate * conditionMultiplier;
  return roundToTwoDecimals(effectiveRate * hours * DOLE_RATES.NIGHT_DIFFERENTIAL_RATE);
}
