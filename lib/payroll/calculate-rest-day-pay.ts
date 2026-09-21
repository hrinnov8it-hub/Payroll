import type {
  PayrollAttendanceInput,
  RateBreakdown,
  RestDayBreakdown,
  PayrollSettings,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export const DEFAULT_REST_DAY_PREMIUM = 0.30; // +30% for work on scheduled rest day

/**
 * Calculates Rest Day work premium pay (Art. 93: +30% of regular wage)
 */
export function calculateRestDayPay(
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown,
  settings?: Partial<PayrollSettings>
): RestDayBreakdown {
  const hours = Math.max(0, attendance.rest_day_hours || 0);

  const rateMultiplier =
    settings?.rest_day_rate !== undefined
      ? Math.max(0, settings.rest_day_rate - 1)
      : DEFAULT_REST_DAY_PREMIUM;

  const amount = roundToTwoDecimals(rates.hourly_rate * hours * rateMultiplier);

  return {
    hours,
    rate_multiplier: rateMultiplier,
    amount,
  };
}
