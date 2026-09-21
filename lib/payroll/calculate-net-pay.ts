import type {
  AttendanceDeductionsBreakdown,
  PayrollItemEntry,
  StatutoryDeductionsBreakdown,
} from '../../types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

export interface NetPayInput {
  grossPay: number;
  attendanceDeductions: AttendanceDeductionsBreakdown;
  statutoryDeductions?: StatutoryDeductionsBreakdown;
  otherDeductions?: PayrollItemEntry[];
}

export interface NetPayResult {
  statutory_deductions_total: number;
  other_deductions_total: number;
  total_deductions: number;
  net_pay: number;
}

/**
 * Calculates Net Pay
 * Formula: Gross Pay - (Attendance Deductions + Statutory Deductions + Other Deductions)
 */
export function calculateNetPay(input: NetPayInput): NetPayResult {
  const otherDeductionsTotal = roundToTwoDecimals(
    (input.otherDeductions || []).reduce((sum, item) => sum + Number(item.amount || 0), 0)
  );

  const statutoryTotal = input.statutoryDeductions
    ? input.statutoryDeductions.total_statutory_deductions
    : 0;

  const totalDeductions = roundToTwoDecimals(
    input.attendanceDeductions.total_attendance_deductions +
      statutoryTotal +
      otherDeductionsTotal
  );

  const netPay = roundToTwoDecimals(Math.max(0, input.grossPay - totalDeductions));

  return {
    statutory_deductions_total: statutoryTotal,
    other_deductions_total: otherDeductionsTotal,
    total_deductions: totalDeductions,
    net_pay: netPay,
  };
}
