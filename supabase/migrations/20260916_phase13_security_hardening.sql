-- ==============================================================================
-- PHASE 13 MIGRATION: AUDIT & SECURITY HARDENING
-- Innov8IT Payroll Production Security, Row Level Security (RLS) & Audit Logging
-- ==============================================================================

-- 1. Create Audit Logs Table for Security Trail
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_role TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index audit logs for security auditing
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- 2. Security Helper Functions
CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'payroll_hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_current_employee_id()
RETURNS UUID AS $$
DECLARE
  emp_id UUID;
BEGIN
  SELECT id INTO emp_id
  FROM public.employees
  WHERE email = (SELECT email FROM public.profiles WHERE id = auth.uid());
  RETURN emp_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS Across All Application Tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payslips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Audit Logs Policies (Immutable Trail)
DROP POLICY IF EXISTS "Admins and HR can view audit logs" ON public.audit_logs;
CREATE POLICY "Admins and HR can view audit logs"
  ON public.audit_logs FOR SELECT
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON public.audit_logs;
CREATE POLICY "Authenticated users can create audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 5. Profiles RLS Hardening
DROP POLICY IF EXISTS "Users can view own profile or admins all" ON public.profiles;
CREATE POLICY "Users can view own profile or admins all"
  ON public.profiles FOR SELECT
  USING (id = auth.uid() OR public.is_admin_or_hr());

DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.profiles;
CREATE POLICY "Admins can manage user profiles"
  ON public.profiles FOR ALL
  USING (public.is_admin_or_hr());

-- 6. Employees, Departments & Positions RLS Hardening
DROP POLICY IF EXISTS "Admins and HR can manage employees" ON public.employees;
CREATE POLICY "Admins and HR can manage employees"
  ON public.employees FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Employees can view own record" ON public.employees;
CREATE POLICY "Employees can view own record"
  ON public.employees FOR SELECT
  USING (
    id = public.get_current_employee_id()
    OR email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS "All authenticated read departments" ON public.departments;
CREATE POLICY "All authenticated read departments"
  ON public.departments FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "All authenticated read positions" ON public.positions;
CREATE POLICY "All authenticated read positions"
  ON public.positions FOR SELECT
  USING (auth.role() = 'authenticated');

-- 7. Payroll Settings & Configurations RLS Hardening
DROP POLICY IF EXISTS "Admins and HR manage settings" ON public.payroll_settings;
CREATE POLICY "Admins and HR manage settings"
  ON public.payroll_settings FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "All authenticated read settings" ON public.payroll_settings;
CREATE POLICY "All authenticated read settings"
  ON public.payroll_settings FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and HR manage earning types" ON public.earning_types;
CREATE POLICY "Admins and HR manage earning types"
  ON public.earning_types FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "All authenticated read earning types" ON public.earning_types;
CREATE POLICY "All authenticated read earning types"
  ON public.earning_types FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and HR manage deduction types" ON public.deduction_types;
CREATE POLICY "Admins and HR manage deduction types"
  ON public.deduction_types FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "All authenticated read deduction types" ON public.deduction_types;
CREATE POLICY "All authenticated read deduction types"
  ON public.deduction_types FOR SELECT
  USING (auth.role() = 'authenticated');

-- 8. Time & Attendance, Periods & Payroll Runs RLS Hardening
DROP POLICY IF EXISTS "Admins and HR manage attendance records" ON public.attendance;
CREATE POLICY "Admins and HR manage attendance records"
  ON public.attendance FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Employees view own attendance records" ON public.attendance;
CREATE POLICY "Employees view own attendance records"
  ON public.attendance FOR SELECT
  USING (employee_id = public.get_current_employee_id());

DROP POLICY IF EXISTS "Admins and HR manage payroll periods" ON public.payroll_periods;
CREATE POLICY "Admins and HR manage payroll periods"
  ON public.payroll_periods FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "All authenticated read payroll periods" ON public.payroll_periods;
CREATE POLICY "All authenticated read payroll periods"
  ON public.payroll_periods FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins and HR manage payroll runs" ON public.payroll_runs;
CREATE POLICY "Admins and HR manage payroll runs"
  ON public.payroll_runs FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Admins and HR manage payroll run items" ON public.payroll_run_items;
CREATE POLICY "Admins and HR manage payroll run items"
  ON public.payroll_run_items FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Admins and HR manage payroll audit events" ON public.payroll_audit_events;
CREATE POLICY "Admins and HR manage payroll audit events"
  ON public.payroll_audit_events FOR ALL
  USING (public.is_admin_or_hr());

-- 9. Payslips RLS Hardening
DROP POLICY IF EXISTS "Admins and HR manage all payslips" ON public.payslips;
CREATE POLICY "Admins and HR manage all payslips"
  ON public.payslips FOR ALL
  USING (public.is_admin_or_hr());

DROP POLICY IF EXISTS "Employees can view own published payslips" ON public.payslips;
CREATE POLICY "Employees can view own published payslips"
  ON public.payslips FOR SELECT
  USING (
    employee_id = public.get_current_employee_id()
    AND status IN ('published', 'paid')
  );

DROP POLICY IF EXISTS "Employees can acknowledge own payslip view" ON public.payslips;
CREATE POLICY "Employees can acknowledge own payslip view"
  ON public.payslips FOR UPDATE
  USING (employee_id = public.get_current_employee_id())
  WITH CHECK (employee_id = public.get_current_employee_id());
