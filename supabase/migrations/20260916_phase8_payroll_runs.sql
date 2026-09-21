-- ==============================================================================
-- Innov8IT Payroll - Phase 8 Payroll Periods and Payroll Runs Migration
-- Payroll Runs, Payroll Run Items (Snapshots), Status Workflow, and RLS
-- ==============================================================================

-- 1. Create Payroll Runs Table
CREATE TABLE IF NOT EXISTS public.payroll_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE RESTRICT,
  run_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'review', 'approved', 'paid', 'locked')),
  total_employees INT NOT NULL DEFAULT 0,
  total_gross_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  total_net_pay NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  processed_by UUID REFERENCES auth.users(id),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_runs_period_id ON public.payroll_runs(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_payroll_runs_status ON public.payroll_runs(status);

-- Trigger for payroll_runs updated_at
DROP TRIGGER IF EXISTS trigger_payroll_runs_updated_at ON public.payroll_runs;
CREATE TRIGGER trigger_payroll_runs_updated_at
  BEFORE UPDATE ON public.payroll_runs
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 2. Create Payroll Run Items (Historical Snapshots) Table
CREATE TABLE IF NOT EXISTS public.payroll_run_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,

  -- Employee Snapshots
  employee_name_snapshot TEXT NOT NULL,
  employee_number_snapshot TEXT NOT NULL,
  department_snapshot TEXT,
  position_snapshot TEXT,
  basic_salary_snapshot NUMERIC(10, 2) NOT NULL,
  hourly_rate_snapshot NUMERIC(8, 2) NOT NULL,
  pay_type_snapshot TEXT NOT NULL,

  -- Attendance / Time Inputs Snapshots
  days_worked NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
  regular_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  night_diff_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  holiday_regular_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  holiday_special_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  rest_day_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00,
  late_minutes INT NOT NULL DEFAULT 0,
  undertime_minutes INT NOT NULL DEFAULT 0,
  absent_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00,

  -- Calculated Pay Snapshots
  basic_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  overtime_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  night_diff_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  holiday_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  rest_day_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  allowances NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  bonuses NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  gross_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Deductions Snapshots
  late_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  undertime_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  absence_deduction NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  other_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  total_deductions NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- Final Net Pay
  net_pay NUMERIC(10, 2) NOT NULL DEFAULT 0.00,

  -- JSONB Detailed Breakdown (Rates, allowance list, deductions list)
  item_breakdown JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_run_employee UNIQUE (payroll_run_id, employee_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payroll_run_items_run_id ON public.payroll_run_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_payroll_run_items_employee_id ON public.payroll_run_items(employee_id);

-- Trigger for payroll_run_items updated_at
DROP TRIGGER IF EXISTS trigger_payroll_run_items_updated_at ON public.payroll_run_items;
CREATE TRIGGER trigger_payroll_run_items_updated_at
  BEFORE UPDATE ON public.payroll_run_items
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payroll_run_items ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: payroll_runs
CREATE POLICY "Authenticated users can view payroll runs"
  ON public.payroll_runs
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and HR can manage payroll runs"
  ON public.payroll_runs
  FOR ALL
  TO authenticated
  USING (public.is_payroll_admin_or_hr())
  WITH CHECK (public.is_payroll_admin_or_hr());

-- 5. RLS Policies: payroll_run_items
CREATE POLICY "Admins and HR can manage all payroll run items"
  ON public.payroll_run_items
  FOR ALL
  TO authenticated
  USING (public.is_payroll_admin_or_hr())
  WITH CHECK (public.is_payroll_admin_or_hr());

CREATE POLICY "Employees can view their own payroll run items"
  ON public.payroll_run_items
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );
