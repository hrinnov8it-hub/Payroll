export type PayFrequency = 'semi_monthly' | 'monthly' | 'weekly' | 'bi_weekly';

export interface PayrollSettings {
  id: string;
  company_name: string;
  pay_frequency: PayFrequency;
  first_cutoff_start_day: number;
  first_cutoff_end_day: number;
  second_cutoff_start_day: number;
  second_cutoff_end_day: number;
  overtime_regular_rate: number;
  overtime_rest_day_rate: number;
  overtime_holiday_rate: number;
  night_diff_rate: number;
  night_diff_start_time: string;
  night_diff_end_time: string;
  regular_holiday_rate: number;
  special_holiday_rate: number;
  rest_day_rate: number;
  rest_day_special_holiday_rate: number;
  rest_day_regular_holiday_rate: number;
  standard_working_days_per_year: number;
  standard_hours_per_day: number;
  grace_period_late_minutes: number;
  enable_statutory_deductions: boolean;
  created_at?: string;
  updated_at?: string;
}

export type EarningCategory = 'allowance' | 'bonus' | 'commission' | 'reimbursement' | 'other';

export interface EarningType {
  id: string;
  name: string;
  code: string;
  category: EarningCategory;
  taxable: boolean;
  is_deminimis: boolean;
  deminimis_limit: number | null;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export type DeductionCategory = 'loan' | 'statutory' | 'company' | 'insurance' | 'other';

export interface DeductionType {
  id: string;
  name: string;
  code: string;
  category: DeductionCategory;
  description: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface EarningTypeFormData {
  name: string;
  code: string;
  category: EarningCategory;
  taxable: boolean;
  is_deminimis: boolean;
  deminimis_limit: number;
  description?: string;
  is_active: boolean;
}

export interface DeductionTypeFormData {
  name: string;
  code: string;
  category: DeductionCategory;
  description?: string;
  is_active: boolean;
}

// ==============================================================================
// Phase 7: Payroll Calculation Engine Types
// ==============================================================================

export interface PayrollEmployeeInput {
  id: string;
  employee_number: string;
  first_name: string;
  last_name: string;
  basic_salary: number;
  pay_type: 'monthly' | 'daily' | 'hourly';
  hourly_rate?: number;
  department_name?: string;
  position_title?: string;
}

export interface PayrollAttendanceInput {
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
}

export interface PayrollItemEntry {
  code: string;
  name: string;
  amount: number;
}

export interface PayrollCalculationInput {
  employee: PayrollEmployeeInput;
  attendance: PayrollAttendanceInput;
  settings?: Partial<PayrollSettings>;
  allowances?: PayrollItemEntry[];
  bonuses?: PayrollItemEntry[];
  deductions?: PayrollItemEntry[];
  includeStatutory?: boolean;
  voluntaryPagIbigEE?: number;
}

export interface RateBreakdown {
  daily_rate: number;
  hourly_rate: number;
  minute_rate: number;
}

export interface BasicPayBreakdown {
  cutoff_basic_pay: number;
  days_worked: number;
  regular_hours: number;
  calculated_amount: number;
}

export interface OvertimeBreakdown {
  hours: number;
  rate_multiplier: number;
  amount: number;
}

export interface NightDiffBreakdown {
  hours: number;
  rate_multiplier: number;
  amount: number;
}

export interface HolidayBreakdown {
  regular_hours: number;
  regular_rate_multiplier: number;
  regular_amount: number;
  special_hours: number;
  special_rate_multiplier: number;
  special_amount: number;
  total_holiday_amount: number;
}

export interface RestDayBreakdown {
  hours: number;
  rate_multiplier: number;
  amount: number;
}

export interface AttendanceDeductionsBreakdown {
  late_minutes: number;
  late_deduction: number;
  undertime_minutes: number;
  undertime_deduction: number;
  absent_days: number;
  absence_deduction: number;
  total_attendance_deductions: number;
}

export interface SSSContributionResult {
  monthly_salary_credit: number;
  regular_ss_employee: number;
  regular_ss_employer: number;
  wisp_employee: number;
  wisp_employer: number;
  ec_employer: number;
  total_employee_monthly: number;
  total_employer_monthly: number;
  total_employee_cutoff: number;
  total_employer_cutoff: number;
}

export interface PhilHealthContributionResult {
  monthly_basic_salary: number;
  premium_rate: number;
  total_monthly_premium: number;
  employee_monthly: number;
  employer_monthly: number;
  employee_cutoff: number;
  employer_cutoff: number;
}

export interface PagIbigContributionResult {
  monthly_basic_salary: number;
  employee_rate: number;
  employer_rate: number;
  total_monthly: number;
  employee_monthly: number;
  employer_monthly: number;
  employee_cutoff: number;
  employer_cutoff: number;
}

export interface WithholdingTaxResult {
  taxable_income: number;
  tax_bracket_label: string;
  base_tax: number;
  percentage_on_excess: number;
  excess_amount: number;
  tax_amount: number;
}

export interface StatutoryDeductionsBreakdown {
  sss: SSSContributionResult;
  philhealth: PhilHealthContributionResult;
  pagibig: PagIbigContributionResult;
  withholding_tax: WithholdingTaxResult;
  total_statutory_deductions: number;
  total_employer_contributions: number;
}

export interface PayrollCalculationResult {
  employee_id: string;
  rates: RateBreakdown;
  basic_pay: BasicPayBreakdown;
  overtime: OvertimeBreakdown;
  night_diff: NightDiffBreakdown;
  holiday: HolidayBreakdown;
  rest_day: RestDayBreakdown;
  total_allowances: number;
  allowances_list: PayrollItemEntry[];
  total_bonuses: number;
  bonuses_list: PayrollItemEntry[];
  gross_pay: number;
  attendance_deductions: AttendanceDeductionsBreakdown;
  statutory_deductions?: StatutoryDeductionsBreakdown;
  other_deductions: number;
  other_deductions_list: PayrollItemEntry[];
  total_deductions: number;
  net_pay: number;
  calculated_at: string;
}

// ==============================================================================
// Phase 8: Payroll Periods and Payroll Runs Types
// ==============================================================================

export type PayrollRunStatus =
  | 'draft'
  | 'processing'
  | 'review'
  | 'approved'
  | 'paid'
  | 'locked';

export interface PayrollRun {
  id: string;
  payroll_period_id: string;
  run_number: string;
  status: PayrollRunStatus;
  total_employees: number;
  total_gross_pay: number;
  total_deductions: number;
  total_net_pay: number;
  notes: string | null;
  processed_by?: string | null;
  processed_at?: string | null;
  // Phase 9: Approval & Locking audit fields
  approved_by?: string | null;
  approved_by_name?: string | null;
  approved_at?: string | null;
  locked_by?: string | null;
  locked_by_name?: string | null;
  locked_at?: string | null;
  review_notes?: string | null;
  created_at: string;
  updated_at: string;
  payroll_period?: {
    id: string;
    name: string;
    start_date: string;
    end_date: string;
    payout_date: string;
    status: string;
  } | null;
}

export interface PayrollRunItem {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  employee_name_snapshot: string;
  employee_number_snapshot: string;
  department_snapshot: string | null;
  position_snapshot: string | null;
  basic_salary_snapshot: number;
  hourly_rate_snapshot: number;
  pay_type_snapshot: string;
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
  basic_pay: number;
  overtime_pay: number;
  night_diff_pay: number;
  holiday_pay: number;
  rest_day_pay: number;
  allowances: number;
  bonuses: number;
  gross_pay: number;
  late_deduction: number;
  undertime_deduction: number;
  absence_deduction: number;
  sss_deduction?: number;
  philhealth_deduction?: number;
  pagibig_deduction?: number;
  tax_deduction?: number;
  employer_contributions?: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
  item_breakdown?: any;
  created_at: string;
  updated_at: string;
}

export interface PayrollRunWithItems extends PayrollRun {
  items: PayrollRunItem[];
}

// ==============================================================================
// Phase 9: Payroll Review and Approval Types
// ==============================================================================

export type PayrollAuditAction =
  | 'run_created'
  | 'status_changed'
  | 'recalculated'
  | 'submitted_for_review'
  | 'returned_to_draft'
  | 'approved'
  | 'marked_paid'
  | 'locked'
  | 'unlocked'
  | 'review_note_added';

export interface PayrollAuditEvent {
  id: string;
  payroll_run_id: string;
  action: PayrollAuditAction;
  performed_by: string;
  performed_by_name: string;
  from_status?: PayrollRunStatus | null;
  to_status?: PayrollRunStatus | null;
  notes?: string | null;
  created_at: string;
}

export interface ApprovalRecord {
  approver_name: string;
  approver_role: string;
  action: string;
  timestamp: string;
  notes?: string | null;
}
