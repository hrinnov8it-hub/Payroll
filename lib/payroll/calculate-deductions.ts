import type {
  PayrollEmployeeInput,
  PayrollAttendanceInput,
  RateBreakdown,
  AttendanceDeductionsBreakdown,
  PayrollSettings,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export const DEFAULT_GRACE_PERIOD_MINUTES = 0;

/**
 * Calculates tardiness (late & undertime) and absence deductions
 */
export function calculateAttendanceDeductions(
  employee: PayrollEmployeeInput,
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown,
  settings?: Partial<PayrollSettings>
): AttendanceDeductionsBreakdown {
  const gracePeriod = settings?.grace_period_late_minutes || DEFAULT_GRACE_PERIOD_MINUTES;

  // Lates
  let billableLateMinutes = attendance.late_minutes || 0;
  if (gracePeriod > 0 && billableLateMinutes <= gracePeriod) {
    billableLateMinutes = 0;
  }
  const lateDeduction = roundToTwoDecimals(billableLateMinutes * rates.minute_rate);

  // Undertime
  const undertimeMinutes = Math.max(0, attendance.undertime_minutes || 0);
  const undertimeDeduction = roundToTwoDecimals(undertimeMinutes * rates.minute_rate);

  // Absences: For monthly salaried, subtract absent days * daily rate.
  // For daily or hourly workers, base pay already reflects only days/hours worked.
  let absenceDeduction = 0;
  if (employee.pay_type === 'monthly') {
    const absentDays = Math.max(0, attendance.absent_days || 0);
    absenceDeduction = roundToTwoDecimals(absentDays * rates.daily_rate);
  }

  const totalDeductions = roundToTwoDecimals(
    lateDeduction + undertimeDeduction + absenceDeduction
  );

  return {
    late_minutes: billableLateMinutes,
    late_deduction: lateDeduction,
    undertime_minutes: undertimeMinutes,
    undertime_deduction: undertimeDeduction,
    absent_days: attendance.absent_days || 0,
    absence_deduction: absenceDeduction,
    total_attendance_deductions: totalDeductions,
  };
}
