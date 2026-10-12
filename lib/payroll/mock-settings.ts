import { PayrollSettings, EarningType, DeductionType } from '@/types/payroll';

export const fallbackPayrollSettings: PayrollSettings = {
  id: 'settings-innov8it-default',
  company_name: 'Innov8IT Corporation',
  pay_frequency: 'semi_monthly',
  first_cutoff_start_day: 1,
  first_cutoff_end_day: 15,
  second_cutoff_start_day: 16,
  second_cutoff_end_day: 0,
  overtime_regular_rate: 1.25,
  overtime_rest_day_rate: 1.30,
  overtime_holiday_rate: 2.00,
  night_diff_rate: 0.10,
  night_diff_start_time: '22:00:00',
  night_diff_end_time: '06:00:00',
  regular_holiday_rate: 2.00,
  special_holiday_rate: 1.30,
  rest_day_rate: 1.30,
  rest_day_special_holiday_rate: 1.50,
  rest_day_regular_holiday_rate: 2.60,
  standard_working_days_per_year: 261,
  standard_hours_per_day: 8,
  grace_period_late_minutes: 10,
  enable_statutory_deductions: true,
  // Super Admin & Master Legal Entity
  tin_number: '009-876-543-000',
  sss_employer_id: '03-9123456-7',
  philhealth_employer_id: '19-025487123-1',
  pagibig_employer_id: '2049-8172-9901',
  rdo_code: '044',
  signatory_name: 'Maria R. Santos',
  signatory_title: 'Head of Human Resources',
  enable_signatory_on_payslips: true,
  require_dual_approval: true,
  lock_closed_periods: true,
  maintenance_mode: false,
};

export const fallbackEarningTypes: EarningType[] = [];

export const fallbackDeductionTypes: DeductionType[] = [];
