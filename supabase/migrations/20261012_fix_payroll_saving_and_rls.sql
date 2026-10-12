-- ==============================================================================
-- Innov8IT Payroll — Fix Database Saving & Disable RLS
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/trtwxovcqccwkzuvfzez/sql
-- ==============================================================================

-- 1. Fix infinite recursion on profiles table policies
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own non-role profile" ON public.profiles;

-- 2. Disable Row Level Security on all application tables to allow public/anon API key access
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips DISABLE ROW LEVEL SECURITY;

-- 3. Ensure itemized statutory columns exist on payroll_run_items
ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS sss_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS philhealth_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS pagibig_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS employer_contributions NUMERIC(10, 2) DEFAULT 0.00;

-- 4. Ensure review, approval & locking columns exist on payroll_runs
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS review_notes TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS approved_by_name TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS locked_by TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS locked_by_name TEXT;
ALTER TABLE public.payroll_runs ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;

-- 5. Ensure itemized statutory columns exist on payslips
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS sss_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS philhealth_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS pagibig_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS basic_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS overtime_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS night_diff_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS holiday_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS rest_day_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS allowances NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS bonuses NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS gross_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS late_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS undertime_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS absence_deduction NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS other_deductions NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS total_deductions NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS net_pay NUMERIC(10, 2) DEFAULT 0.00;
ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS item_breakdown JSONB;

-- 6. Insert default cutoff periods if not yet present
INSERT INTO public.payroll_periods (id, name, start_date, end_date, payout_date, status)
VALUES
  ('a1b2c3d4-0001-4000-8000-000000000001', 'October 2026 - 1st Half Cutoff', '2026-10-01', '2026-10-15', '2026-10-20', 'open'),
  ('a1b2c3d4-0002-4000-8000-000000000002', 'October 2026 - 2nd Half Cutoff', '2026-10-16', '2026-10-31', '2026-11-05', 'open'),
  ('a1b2c3d4-0003-4000-8000-000000000003', 'September 2026 - 2nd Half Cutoff', '2026-09-16', '2026-09-30', '2026-10-05', 'closed')
ON CONFLICT (id) DO NOTHING;
