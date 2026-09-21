import { EmployeeWithRelations } from './employee';

export type PeriodStatus = 'open' | 'processing' | 'closed';

export interface PayrollPeriod {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  payout_date: string;
  status: PeriodStatus;
  created_at?: string;
}

export interface AttendanceRecord {
  id: string;
  employee_id: string;
  payroll_period_id: string;
  days_worked: number;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  absent_days: number;
  holiday_regular_hours: number;
  holiday_special_hours: number;
  rest_day_hours: number;
  notes: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface AttendanceRecordWithEmployee extends AttendanceRecord {
  employee?: EmployeeWithRelations | null;
  payroll_period?: PayrollPeriod | null;
}

export interface AttendanceFormData {
  id?: string;
  employee_id: string;
  payroll_period_id: string;
  days_worked: number;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  late_minutes: number;
  undertime_minutes: number;
  absent_days: number;
  holiday_regular_hours: number;
  holiday_special_hours: number;
  rest_day_hours: number;
  notes?: string;
}

export interface AttendanceFilters {
  period_id?: string;
  department_id?: string;
  search?: string;
}
