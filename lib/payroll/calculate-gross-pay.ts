import type {
  BasicPayBreakdown,
  OvertimeBreakdown,
  NightDiffBreakdown,
  HolidayBreakdown,
  RestDayBreakdown,
  PayrollItemEntry,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export interface GrossPayInput {
  basicPay: BasicPayBreakdown;
  overtime: OvertimeBreakdown;
  nightDiff: NightDiffBreakdown;
  holiday: HolidayBreakdown;
  restDay: RestDayBreakdown;
  allowances?: PayrollItemEntry[];
  bonuses?: PayrollItemEntry[];
}

export interface GrossPayResult {
  total_allowances: number;
  total_bonuses: number;
  gross_pay: number;
}

/**
 * Calculates Gross Pay
 * Formula: Basic Pay + OT + Night Diff + Holiday + Rest Day + Allowances + Bonuses
 */
export function calculateGrossPay(input: GrossPayInput): GrossPayResult {
  const totalAllowances = roundToTwoDecimals(
    (input.allowances || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  const totalBonuses = roundToTwoDecimals(
    (input.bonuses || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  const grossPay = roundToTwoDecimals(
    input.basicPay.calculated_amount +
      input.overtime.amount +
      input.nightDiff.amount +
      input.holiday.total_holiday_amount +
      input.restDay.amount +
      totalAllowances +
      totalBonuses
  );

  return {
    total_allowances: totalAllowances,
    total_bonuses: totalBonuses,
    gross_pay: grossPay,
  };
}
