-- ==============================================================================
-- Innov8IT Payroll - Super Admin & Master Legal Entity Settings Migration
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard/project/trtwxovcqccwkzuvfzez/sql)
-- ==============================================================================

-- 1. Extend user_role ENUM to include 'super_admin' if not present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = 'user_role'::regtype
      AND enumlabel = 'super_admin'
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin' BEFORE 'admin';
  END IF;
EXCEPTION
  WHEN undefined_object THEN
    CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'payroll_hr', 'employee');
END $$;

-- 2. Extend payroll_settings with Master Tax Registration & Governance policies
ALTER TABLE public.payroll_settings
  ADD COLUMN IF NOT EXISTS tin_number TEXT DEFAULT '009-876-543-000',
  ADD COLUMN IF NOT EXISTS sss_employer_id TEXT DEFAULT '03-9123456-7',
  ADD COLUMN IF NOT EXISTS philhealth_employer_id TEXT DEFAULT '19-025487123-1',
  ADD COLUMN IF NOT EXISTS pagibig_employer_id TEXT DEFAULT '2049-8172-9901',
  ADD COLUMN IF NOT EXISTS rdo_code TEXT DEFAULT '044',
  ADD COLUMN IF NOT EXISTS signatory_name TEXT DEFAULT 'Maria R. Santos',
  ADD COLUMN IF NOT EXISTS signatory_title TEXT DEFAULT 'Head of Human Resources',
  ADD COLUMN IF NOT EXISTS enable_signatory_on_payslips BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_dual_approval BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS lock_closed_periods BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN DEFAULT false;

-- 3. Update Security Function to recognize 'super_admin'
CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('super_admin', 'admin', 'payroll_hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Ensure HR Admin and Super Admin default profiles exist in profiles table
INSERT INTO public.profiles (id, email, full_name, role)
VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'superadmin.innov8it@gmail.com', 'Innov8IT System Owner', 'super_admin'),
  ('a0000000-0000-0000-0000-000000000002', 'hr.innov8it@gmail.com', 'HR Administrator', 'admin')
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    role = EXCLUDED.role;
