import type {
  PayrollAttendanceInput,
  RateBreakdown,
  OvertimeBreakdown,
  PayrollSettings,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export const DEFAULT_OVERTIME_REGULAR_RATE = 1.25;

/**
 * Calculates overtime pay for regular workdays (125% regular wage)
 */
export function calculateOvertime(
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown,
  settings?: Partial<PayrollSettings>
): OvertimeBreakdown {
  const hours = Math.max(0, attendance.overtime_hours || 0);
  const rateMultiplier =
    settings?.overtime_regular_rate || DEFAULT_OVERTIME_REGULAR_RATE;

  const amount = roundToTwoDecimals(rates.hourly_rate * hours * rateMultiplier);

  return {
    hours,
    rate_multiplier: rateMultiplier,
    amount,
  };
}
