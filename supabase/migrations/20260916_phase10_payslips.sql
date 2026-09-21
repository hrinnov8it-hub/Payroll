-- ==============================================================================
-- Innov8IT Payroll - Phase 10 Payslips Migration
-- Creates the payslips table, status workflow, and employee-specific RLS policies
-- Run this in your Supabase SQL Editor AFTER Phase 9 migration
-- https://supabase.com/dashboard/project/trtwxovcqccwkzuvfzez/sql
-- ==============================================================================

-- 1. Create Payslips Table
CREATE TABLE IF NOT EXISTS public.payslips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  payroll_run_item_id UUID NOT NULL REFERENCES public.payroll_run_items(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
  
  -- Reference & Metadata
  payslip_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'generated' CHECK (status IN ('generated', 'published', 'viewed')),
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  viewed_at TIMESTAMPTZ,
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast query lookup
CREATE INDEX IF NOT EXISTS idx_payslips_payroll_run_id ON public.payslips(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payslips_employee_id ON public.payslips(employee_id);
CREATE INDEX IF NOT EXISTS idx_payslips_status ON public.payslips(status);
CREATE INDEX IF NOT EXISTS idx_payslips_payslip_number ON public.payslips(payslip_number);

-- Trigger for payslips updated_at
DROP TRIGGER IF EXISTS trigger_payslips_updated_at ON public.payslips;
CREATE TRIGGER trigger_payslips_updated_at
  BEFORE UPDATE ON public.payslips
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- Admins and HR have full access to manage all payslips
DROP POLICY IF EXISTS "Admins and HR can manage all payslips" ON public.payslips;
CREATE POLICY "Admins and HR can manage all payslips"
  ON public.payslips
  FOR ALL
  TO authenticated
  USING (public.is_payroll_admin_or_hr())
  WITH CHECK (public.is_payroll_admin_or_hr());

-- Employees can ONLY view their own published or generated payslips
DROP POLICY IF EXISTS "Employees can view their own payslips" ON public.payslips;
CREATE POLICY "Employees can view their own payslips"
  ON public.payslips
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

-- Employees can update viewed_at on their own payslips
DROP POLICY IF EXISTS "Employees can mark their own payslip as viewed" ON public.payslips;
CREATE POLICY "Employees can mark their own payslip as viewed"
  ON public.payslips
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
