/**
 * Supabase Database Type Definitions
 * Phase 5: Profiles, Departments, Positions, Employees, Payroll Settings, Earning Types, Deduction Types
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          name: string;
          code: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      positions: {
        Row: {
          id: string;
          department_id: string | null;
          title: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          department_id?: string | null;
          title: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          department_id?: string | null;
          title?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      employees: {
        Row: {
          id: string;
          employee_number: string;
          first_name: string;
          middle_name: string | null;
          last_name: string;
          email: string;
          department_id: string | null;
          position_id: string | null;
          employment_type: 'regular' | 'probationary' | 'contractual' | 'part_time';
          pay_type: 'monthly' | 'daily' | 'hourly';
          basic_salary: number;
          hourly_rate: number;
          hire_date: string;
          status: 'active' | 'inactive' | 'terminated';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_number: string;
          first_name: string;
          middle_name?: string | null;
          last_name: string;
          email: string;
          department_id?: string | null;
          position_id?: string | null;
          employment_type?: 'regular' | 'probationary' | 'contractual' | 'part_time';
          pay_type?: 'monthly' | 'daily' | 'hourly';
          basic_salary?: number;
          hourly_rate?: number;
          hire_date?: string;
          status?: 'active' | 'inactive' | 'terminated';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_number?: string;
          first_name?: string;
          middle_name?: string | null;
          last_name?: string;
          email?: string;
          department_id?: string | null;
          position_id?: string | null;
          employment_type?: 'regular' | 'probationary' | 'contractual' | 'part_time';
          pay_type?: 'monthly' | 'daily' | 'hourly';
          basic_salary?: number;
          hourly_rate?: number;
          hire_date?: string;
          status?: 'active' | 'inactive' | 'terminated';
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_settings: {
        Row: {
          id: string;
          company_name: string;
          pay_frequency: 'semi_monthly' | 'monthly' | 'weekly' | 'bi_weekly';
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_name?: string;
          pay_frequency?: 'semi_monthly' | 'monthly' | 'weekly' | 'bi_weekly';
          first_cutoff_start_day?: number;
          first_cutoff_end_day?: number;
          second_cutoff_start_day?: number;
          second_cutoff_end_day?: number;
          overtime_regular_rate?: number;
          overtime_rest_day_rate?: number;
          overtime_holiday_rate?: number;
          night_diff_rate?: number;
          night_diff_start_time?: string;
          night_diff_end_time?: string;
          regular_holiday_rate?: number;
          special_holiday_rate?: number;
          rest_day_rate?: number;
          rest_day_special_holiday_rate?: number;
          rest_day_regular_holiday_rate?: number;
          standard_working_days_per_year?: number;
          standard_hours_per_day?: number;
          grace_period_late_minutes?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          company_name?: string;
          pay_frequency?: 'semi_monthly' | 'monthly' | 'weekly' | 'bi_weekly';
          first_cutoff_start_day?: number;
          first_cutoff_end_day?: number;
          second_cutoff_start_day?: number;
          second_cutoff_end_day?: number;
          overtime_regular_rate?: number;
          overtime_rest_day_rate?: number;
          overtime_holiday_rate?: number;
          night_diff_rate?: number;
          night_diff_start_time?: string;
          night_diff_end_time?: string;
          regular_holiday_rate?: number;
          special_holiday_rate?: number;
          rest_day_rate?: number;
          rest_day_special_holiday_rate?: number;
          rest_day_regular_holiday_rate?: number;
          standard_working_days_per_year?: number;
          standard_hours_per_day?: number;
          grace_period_late_minutes?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      earning_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          category: string;
          taxable: boolean;
          is_deminimis: boolean;
          deminimis_limit: number | null;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          category?: string;
          taxable?: boolean;
          is_deminimis?: boolean;
          deminimis_limit?: number | null;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          category?: string;
          taxable?: boolean;
          is_deminimis?: boolean;
          deminimis_limit?: number | null;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      deduction_types: {
        Row: {
          id: string;
          name: string;
          code: string;
          category: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          code: string;
          category?: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          code?: string;
          category?: string;
          description?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      payroll_periods: {
        Row: {
          id: string;
          name: string;
          start_date: string;
          end_date: string;
          payout_date: string;
          status: 'open' | 'processing' | 'closed';
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          start_date: string;
          end_date: string;
          payout_date: string;
          status?: 'open' | 'processing' | 'closed';
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          start_date?: string;
          end_date?: string;
          payout_date?: string;
          status?: 'open' | 'processing' | 'closed';
        };
        Relationships: [];
      };
      attendance: {
        Row: {
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
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          employee_id: string;
          payroll_period_id: string;
          days_worked?: number;
          regular_hours?: number;
          overtime_hours?: number;
          night_diff_hours?: number;
          late_minutes?: number;
          undertime_minutes?: number;
          absent_days?: number;
          holiday_regular_hours?: number;
          holiday_special_hours?: number;
          rest_day_hours?: number;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          employee_id?: string;
          payroll_period_id?: string;
          days_worked?: number;
          regular_hours?: number;
          overtime_hours?: number;
          night_diff_hours?: number;
          late_minutes?: number;
          undertime_minutes?: number;
          absent_days?: number;
          holiday_regular_hours?: number;
          holiday_special_hours?: number;
          rest_day_hours?: number;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_runs: {
        Row: {
          id: string;
          payroll_period_id: string;
          run_number: string;
          status: 'draft' | 'processing' | 'review' | 'approved' | 'paid' | 'locked';
          total_employees: number;
          total_gross_pay: number;
          total_deductions: number;
          total_net_pay: number;
          notes: string | null;
          processed_by: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_period_id: string;
          run_number: string;
          status?: 'draft' | 'processing' | 'review' | 'approved' | 'paid' | 'locked';
          total_employees?: number;
          total_gross_pay?: number;
          total_deductions?: number;
          total_net_pay?: number;
          notes?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payroll_period_id?: string;
          run_number?: string;
          status?: 'draft' | 'processing' | 'review' | 'approved' | 'paid' | 'locked';
          total_employees?: number;
          total_gross_pay?: number;
          total_deductions?: number;
          total_net_pay?: number;
          notes?: string | null;
          processed_by?: string | null;
          processed_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      payroll_run_items: {
        Row: {
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
          other_deductions: number;
          total_deductions: number;
          net_pay: number;
          item_breakdown: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          employee_id: string;
          employee_name_snapshot: string;
          employee_number_snapshot: string;
          department_snapshot?: string | null;
          position_snapshot?: string | null;
          basic_salary_snapshot: number;
          hourly_rate_snapshot: number;
          pay_type_snapshot: string;
          days_worked?: number;
          regular_hours?: number;
          overtime_hours?: number;
          night_diff_hours?: number;
          holiday_regular_hours?: number;
          holiday_special_hours?: number;
          rest_day_hours?: number;
          late_minutes?: number;
          undertime_minutes?: number;
          absent_days?: number;
          basic_pay?: number;
          overtime_pay?: number;
          night_diff_pay?: number;
          holiday_pay?: number;
          rest_day_pay?: number;
          allowances?: number;
          bonuses?: number;
          gross_pay?: number;
          late_deduction?: number;
          undertime_deduction?: number;
          absence_deduction?: number;
          other_deductions?: number;
          total_deductions?: number;
          net_pay?: number;
          item_breakdown?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          employee_id?: string;
          employee_name_snapshot?: string;
          employee_number_snapshot?: string;
          department_snapshot?: string | null;
          position_snapshot?: string | null;
          basic_salary_snapshot?: number;
          hourly_rate_snapshot?: number;
          pay_type_snapshot?: string;
          days_worked?: number;
          regular_hours?: number;
          overtime_hours?: number;
          night_diff_hours?: number;
          holiday_regular_hours?: number;
          holiday_special_hours?: number;
          rest_day_hours?: number;
          late_minutes?: number;
          undertime_minutes?: number;
          absent_days?: number;
          basic_pay?: number;
          overtime_pay?: number;
          night_diff_pay?: number;
          holiday_pay?: number;
          rest_day_pay?: number;
          allowances?: number;
          bonuses?: number;
          gross_pay?: number;
          late_deduction?: number;
          undertime_deduction?: number;
          absence_deduction?: number;
          other_deductions?: number;
          total_deductions?: number;
          net_pay?: number;
          item_breakdown?: Json;
          updated_at?: string;
        };
        Relationships: [];
      };
      payslips: {
        Row: {
          id: string;
          payroll_run_id: string;
          payroll_run_item_id: string;
          employee_id: string;
          payslip_number: string;
          status: 'generated' | 'published' | 'viewed';
          issue_date: string;
          viewed_at: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_run_id: string;
          payroll_run_item_id: string;
          employee_id: string;
          payslip_number: string;
          status?: 'generated' | 'published' | 'viewed';
          issue_date?: string;
          viewed_at?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          payroll_run_id?: string;
          payroll_run_item_id?: string;
          employee_id?: string;
          payslip_number?: string;
          status?: 'generated' | 'published' | 'viewed';
          issue_date?: string;
          viewed_at?: string | null;
          notes?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      audit_logs: {
        Row: {
          id: string;
          action: string;
          entity_type: string;
          entity_id: string;
          actor_id: string | null;
          actor_email: string | null;
          actor_role: string | null;
          details: Json | null;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action: string;
          entity_type: string;
          entity_id: string;
          actor_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          details?: Json | null;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          action?: string;
          entity_type?: string;
          entity_id?: string;
          actor_id?: string | null;
          actor_email?: string | null;
          actor_role?: string | null;
          details?: Json | null;
          ip_address?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_payroll_admin_or_hr: {
        Args: Record<string, never>;
        Returns: boolean;
      };
    };
    Enums: {
      user_role: 'admin' | 'payroll_hr' | 'employee';
      employment_type: 'regular' | 'probationary' | 'contractual' | 'part_time';
      pay_type: 'monthly' | 'daily' | 'hourly';
      employee_status: 'active' | 'inactive' | 'terminated';
    };
  };
}
