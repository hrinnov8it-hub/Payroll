import type {
  PayrollAttendanceInput,
  RateBreakdown,
  NightDiffBreakdown,
  PayrollSettings,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export const DEFAULT_NIGHT_DIFF_RATE = 0.10;

/**
 * Calculates Night Shift Differential pay (Labor Code Art. 86: +10% for 10PM - 6AM)
 */
export function calculateNightDifferential(
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown,
  settings?: Partial<PayrollSettings>
): NightDiffBreakdown {
  const hours = Math.max(0, attendance.night_diff_hours || 0);
  const rateMultiplier =
    settings?.night_diff_rate !== undefined ? settings.night_diff_rate : DEFAULT_NIGHT_DIFF_RATE;

  const amount = roundToTwoDecimals(rates.hourly_rate * hours * rateMultiplier);

  return {
    hours,
    rate_multiplier: rateMultiplier,
    amount,
  };
}
