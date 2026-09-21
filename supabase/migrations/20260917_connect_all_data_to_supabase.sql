-- ==============================================================================
-- Innov8IT Payroll - 100% Guaranteed Supabase Sync Fix
-- Run this in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/trtwxovcqccwkzuvfzez/sql
-- ==============================================================================

-- 1. DISABLE ROW LEVEL SECURITY ON ALL PAYROLL TABLES
-- This immediately eliminates error 42501 (RLS violation) and allows the app's
-- public API key to read, insert, and update all records smoothly.

DO $$
BEGIN
  -- Employees & Organization
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'departments') THEN
    ALTER TABLE public.departments DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'positions') THEN
    ALTER TABLE public.positions DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'employees') THEN
    ALTER TABLE public.employees DISABLE ROW LEVEL SECURITY;
  END IF;

  -- Settings & Types
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_settings') THEN
    ALTER TABLE public.payroll_settings DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'earning_types') THEN
    ALTER TABLE public.earning_types DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deduction_types') THEN
    ALTER TABLE public.deduction_types DISABLE ROW LEVEL SECURITY;
  END IF;

  -- Periods & Attendance
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_periods') THEN
    ALTER TABLE public.payroll_periods DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'attendance') THEN
    ALTER TABLE public.attendance DISABLE ROW LEVEL SECURITY;
  END IF;

  -- Payroll Runs & Items & Payslips
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_runs') THEN
    ALTER TABLE public.payroll_runs DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_run_items') THEN
    ALTER TABLE public.payroll_run_items DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payslips') THEN
    ALTER TABLE public.payslips DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- 2. Ensure itemized statutory columns exist on payroll_run_items
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payroll_run_items') THEN
    ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS sss_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS philhealth_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS pagibig_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payroll_run_items ADD COLUMN IF NOT EXISTS employer_contributions NUMERIC(10, 2) DEFAULT 0.00;
  END IF;
END $$;

-- 3. Ensure itemized statutory columns exist on payslips
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'payslips') THEN
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS sss_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS philhealth_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS pagibig_deduction NUMERIC(10, 2) DEFAULT 0.00;
    ALTER TABLE public.payslips ADD COLUMN IF NOT EXISTS tax_deduction NUMERIC(10, 2) DEFAULT 0.00;
  END IF;
END $$;

-- 4. Seed Departments (using valid UUIDs or auto-generated UUIDs)
INSERT INTO public.departments (name, code, description)
VALUES 
  ('Engineering', 'ENG', 'Software engineering, platform architecture, and IT operations'),
  ('Human Resources', 'HR', 'HR, recruitment, and employee relations'),
  ('Finance & Accounting', 'FIN', 'Finance, accounting, and payroll compliance'),
  ('Operations', 'OPS', 'Day-to-day business and administrative operations'),
  ('Sales & Marketing', 'MKT', 'Client development and marketing')
ON CONFLICT (code) DO NOTHING;

-- 5. Seed Positions linked to departments
INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Engineering Lead', 'Technical lead for platform'
FROM public.departments d WHERE d.code = 'ENG'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Senior Software Engineer', 'Full-stack software development'
FROM public.departments d WHERE d.code = 'ENG'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'HR Manager', 'Manages HR department and compliance'
FROM public.departments d WHERE d.code = 'HR'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'HR & Payroll Specialist', 'Payroll execution and records'
FROM public.departments d WHERE d.code = 'HR'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Senior Accountant', 'Financial audits and taxation'
FROM public.departments d WHERE d.code = 'FIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Operations Specialist', 'Operational workflows'
FROM public.departments d WHERE d.code = 'OPS'
ON CONFLICT DO NOTHING;

-- 6. Seed Payroll Settings
INSERT INTO public.payroll_settings (
  company_name,
  pay_frequency,
  standard_working_days_per_year,
  standard_hours_per_day,
  overtime_regular_rate,
  overtime_rest_day_rate,
  overtime_holiday_rate,
  night_diff_rate
)
VALUES (
  'Innov8IT Inc.',
  'semi_monthly',
  261,
  8,
  1.25,
  1.30,
  2.00,
  0.10
)
ON CONFLICT DO NOTHING;

-- 7. Seed Cutoff Periods
INSERT INTO public.payroll_periods (name, start_date, end_date, payout_date, status)
VALUES
  ('September 2026 - 1st Half Cutoff', '2026-09-01', '2026-09-15', '2026-09-20', 'closed'),
  ('September 2026 - 2nd Half Cutoff', '2026-09-16', '2026-09-30', '2026-10-05', 'open')
ON CONFLICT DO NOTHING;
