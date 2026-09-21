import type {
  PayrollEmployeeInput,
  PayrollAttendanceInput,
  RateBreakdown,
  BasicPayBreakdown,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Calculates cutoff basic pay
 */
export function calculateBasicPay(
  employee: PayrollEmployeeInput,
  attendance: PayrollAttendanceInput,
  rates: RateBreakdown
): BasicPayBreakdown {
  let calculatedAmount = 0;
  const cutoffBasicPay =
    employee.pay_type === 'monthly'
      ? roundToTwoDecimals(employee.basic_salary / 2)
      : roundToTwoDecimals(rates.daily_rate * 11);

  switch (employee.pay_type) {
    case 'monthly': {
      // Monthly salaried employees receive fixed semi-monthly cutoff pay,
      // with absences and tardiness deducted separately in deductions.
      calculatedAmount = cutoffBasicPay;
      break;
    }
    case 'daily': {
      // Daily paid workers earn for actual days worked
      calculatedAmount = roundToTwoDecimals(rates.daily_rate * attendance.days_worked);
      break;
    }
    case 'hourly': {
      // Hourly paid workers earn for actual regular hours worked
      calculatedAmount = roundToTwoDecimals(rates.hourly_rate * attendance.regular_hours);
      break;
    }
  }

  return {
    cutoff_basic_pay: cutoffBasicPay,
    days_worked: attendance.days_worked,
    regular_hours: attendance.regular_hours,
    calculated_amount: calculatedAmount,
  };
}
