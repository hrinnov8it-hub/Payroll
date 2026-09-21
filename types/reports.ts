import { PayrollRunStatus } from './payroll';

export type ReportType =
  | 'summary'
  | 'department_totals'
  | 'government_contributions'
  | 'tax_summary'
  | 'overtime_night_diff'
  | 'employee_history';

export interface ReportFilterOptions {
  periodId?: string;
  departmentId?: string;
  employeeId?: string;
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
}

export interface PayrollSummaryReportRow {
  run_id: string;
  run_number: string;
  period_name: string;
  period_start: string;
  period_end: string;
  payout_date: string;
  status: PayrollRunStatus;
  total_employees: number;
  total_basic_pay: number;
  total_overtime_pay: number;
  total_night_diff_pay: number;
  total_holiday_pay: number;
  total_allowances: number;
  total_gross_pay: number;
  total_attendance_deductions: number;
  total_statutory_deductions: number;
  total_withholding_tax: number;
  total_other_deductions: number;
  total_deductions: number;
  total_net_pay: number;
  total_employer_contributions: number;
}

export interface DepartmentTotalsReportRow {
  department_name: string;
  employee_count: number;
  total_basic_pay: number;
  total_overtime_pay: number;
  total_night_diff_pay: number;
  total_allowances: number;
  total_gross_pay: number;
  total_attendance_deductions: number;
  total_statutory_employee: number;
  total_withholding_tax: number;
  total_deductions: number;
  total_employer_contributions: number;
  total_net_pay: number;
}

export interface SSSReportRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  monthly_salary_credit: number;
  regular_ee: number;
  regular_er: number;
  wisp_ee: number;
  wisp_er: number;
  ec_er: number;
  total_ee: number;
  total_er: number;
  total_contribution: number;
}

export interface PhilHealthReportRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  covered_monthly_salary: number;
  premium_rate: number;
  employee_share: number;
  employer_share: number;
  total_premium: number;
}

export interface PagIbigReportRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  covered_salary: number;
  employee_mandatory: number;
  employee_voluntary: number;
  employer_mandatory: number;
  total_employee_share: number;
  total_remittance: number;
}

export interface GovernmentContributionsReport {
  period_name: string;
  sss_rows: SSSReportRow[];
  philhealth_rows: PhilHealthReportRow[];
  pagibig_rows: PagIbigReportRow[];
  totals: {
    total_sss_ee: number;
    total_sss_er: number;
    total_sss: number;
    total_phic_ee: number;
    total_phic_er: number;
    total_phic: number;
    total_hdmf_ee: number;
    total_hdmf_er: number;
    total_hdmf: number;
    grand_total_employee_contributions: number;
    grand_total_employer_contributions: number;
    grand_total_remittances: number;
  };
}

export interface TaxSummaryReportRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  gross_taxable_compensation: number;
  statutory_contributions_exempt: number;
  net_taxable_compensation: number;
  tax_bracket_label: string;
  withholding_tax_amount: number;
}

export interface OvertimeNightDiffReportRow {
  employee_id: string;
  employee_name: string;
  employee_number: string;
  department: string;
  regular_overtime_hours: number;
  regular_overtime_pay: number;
  rest_day_hours: number;
  rest_day_pay: number;
  holiday_hours: number;
  holiday_pay: number;
  night_diff_hours: number;
  night_diff_pay: number;
  total_premium_hours: number;
  total_premium_pay: number;
}

export interface EmployeeHistoryReportRow {
  period_name: string;
  payout_date: string;
  run_number: string;
  status: PayrollRunStatus;
  days_worked: number;
  regular_hours: number;
  overtime_hours: number;
  night_diff_hours: number;
  basic_pay: number;
  overtime_pay: number;
  night_diff_pay: number;
  holiday_pay: number;
  allowances: number;
  bonuses: number;
  gross_pay: number;
  attendance_deductions: number;
  sss_deduction: number;
  philhealth_deduction: number;
  pagibig_deduction: number;
  tax_deduction: number;
  other_deductions: number;
  total_deductions: number;
  net_pay: number;
}

export interface ReportExecutiveKPIs {
  total_payroll_disbursed: number;
  total_gross_earnings: number;
  total_employee_deductions: number;
  total_employer_burden: number;
  total_government_remittances: number;
  total_overtime_and_premiums: number;
  total_active_employees_processed: number;
}
