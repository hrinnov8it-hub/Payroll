import type {
  PayrollAttendanceInput,
  RateBreakdown,
  HolidayBreakdown,
  PayrollSettings,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export const DEFAULT_REGULAR_HOLIDAY_PREMIUM = 1.0; // +100% premium for working on regular holiday
export const DEFAULT_SPECIAL_HOLIDAY_PREMIUM = 0.3; // +30% premium for working on special non-working holiday

/**
 * Calculates additional holiday pay premiums for worked holiday hours
 */
export function calculateHolidayPay(
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown,
  settings?: Partial<PayrollSettings>
): HolidayBreakdown {
  const regularHours = Math.max(0, attendance.holiday_regular_hours || 0);
  const specialHours = Math.max(0, attendance.holiday_special_hours || 0);

  // If settings have regular_holiday_rate (e.g. 2.00), premium is (rate - 1) = 1.0
  const regularRateMultiplier =
    settings?.regular_holiday_rate !== undefined
      ? Math.max(0, settings.regular_holiday_rate - 1)
      : DEFAULT_REGULAR_HOLIDAY_PREMIUM;

  // If settings have special_holiday_rate (e.g. 1.30), premium is (rate - 1) = 0.30
  const specialRateMultiplier =
    settings?.special_holiday_rate !== undefined
      ? Math.max(0, settings.special_holiday_rate - 1)
      : DEFAULT_SPECIAL_HOLIDAY_PREMIUM;

  const regularAmount = roundToTwoDecimals(
    rates.hourly_rate * regularHours * regularRateMultiplier
  );
  const specialAmount = roundToTwoDecimals(
    rates.hourly_rate * specialHours * specialRateMultiplier
  );

  return {
    regular_hours: regularHours,
    regular_rate_multiplier: regularRateMultiplier,
    regular_amount: regularAmount,
    special_hours: specialHours,
    special_rate_multiplier: specialRateMultiplier,
    special_amount: specialAmount,
    total_holiday_amount: roundToTwoDecimals(regularAmount + specialAmount),
  };
}
