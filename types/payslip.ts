/**
 * Phase 10: Payslip Types and Interfaces
 */

export type PayslipStatus = 'generated' | 'published' | 'viewed';

export interface PayslipItemEntry {
  code?: string;
  name: string;
  amount: number;
}

export interface Payslip {
  id: string;
  payroll_run_id: string;
  payroll_run_item_id: string;
  employee_id: string;
  payslip_number: string;
  status: PayslipStatus;
  issue_date: string;
  viewed_at?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;

  // Hydrated Snapshot Information
  employee_name: string;
  employee_number: string;
  employee_email?: string;
  department: string | null;
  position: string | null;
  pay_type: string;
  basic_salary: number;
  hourly_rate: number;

  // Period Information
  period_id?: string;
  period_name: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  run_number: string;

  // Attendance & Time Breakdown
  days_worked: number;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  holiday_regular_hours: number;
  holiday_special_hours: number;
  rest_day_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  absent_days: number;

  // Earnings Breakdown
  basic_pay: number;
  overtime_pay: number;
  night_diff_pay: number;
  holiday_pay: number;
  rest_day_pay: number;
  allowances: number;
  allowances_list?: PayslipItemEntry[];
  bonuses: number;
  bonuses_list?: PayslipItemEntry[];
  other_earnings?: number;
  gross_pay: number;

  // Deductions Breakdown
  late_deduction: number;
  undertime_deduction: number;
  absence_deduction: number;
  sss_deduction?: number;
  philhealth_deduction?: number;
  pagibig_deduction?: number;
  tax_deduction?: number;
  loan_deductions?: number;
  other_deductions: number;
  other_deductions_list?: PayslipItemEntry[];
  total_deductions: number;

  // Net Take-Home Pay
  net_pay: number;
  item_breakdown?: any;
}

export interface PayslipFilters {
  periodId?: string;
  departmentId?: string;
  status?: PayslipStatus | 'all';
  search?: string;
  employeeId?: string;
}

export interface PayslipAccessUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'payroll_hr' | 'employee';
  employeeId?: string;
}
