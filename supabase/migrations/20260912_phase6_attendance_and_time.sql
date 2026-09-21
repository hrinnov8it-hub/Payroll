-- ==============================================================================
-- Innov8IT Payroll - Phase 6 Attendance & Time Inputs Migration
-- Payroll Periods, Attendance Table, RLS Policies, and Initial Seed Data
-- ==============================================================================

-- 1. Create Payroll Periods Table
CREATE TABLE IF NOT EXISTS public.payroll_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  payout_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'processing', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_period_dates CHECK (end_date >= start_date)
);

-- 2. Create Attendance Table
CREATE TABLE IF NOT EXISTS public.attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  payroll_period_id UUID NOT NULL REFERENCES public.payroll_periods(id) ON DELETE CASCADE,
  days_worked NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (days_worked >= 0),
  regular_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (regular_hours >= 0),
  overtime_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (overtime_hours >= 0),
  night_diff_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (night_diff_hours >= 0),
  late_minutes INT NOT NULL DEFAULT 0 CHECK (late_minutes >= 0),
  undertime_minutes INT NOT NULL DEFAULT 0 CHECK (undertime_minutes >= 0),
  absent_days NUMERIC(5, 2) NOT NULL DEFAULT 0.00 CHECK (absent_days >= 0),
  holiday_regular_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (holiday_regular_hours >= 0),
  holiday_special_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (holiday_special_hours >= 0),
  rest_day_hours NUMERIC(6, 2) NOT NULL DEFAULT 0.00 CHECK (rest_day_hours >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_employee_period UNIQUE (employee_id, payroll_period_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_attendance_period_id ON public.attendance(payroll_period_id);
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id ON public.attendance(employee_id);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_attendance_updated_at ON public.attendance;
CREATE TRIGGER trigger_attendance_updated_at
  BEFORE UPDATE ON public.attendance
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: payroll_periods
CREATE POLICY "Authenticated users can view payroll periods"
  ON public.payroll_periods
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and HR can manage payroll periods"
  ON public.payroll_periods
  FOR ALL
  TO authenticated
  USING (public.is_payroll_admin_or_hr())
  WITH CHECK (public.is_payroll_admin_or_hr());

-- 5. RLS Policies: attendance
CREATE POLICY "HR and Admin can view all attendance"
  ON public.attendance
  FOR SELECT
  TO authenticated
  USING (
    public.is_payroll_admin_or_hr() OR
    employee_id IN (
      SELECT id FROM public.employees
      WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins and HR can manage attendance"
  ON public.attendance
  FOR ALL
  TO authenticated
  USING (public.is_payroll_admin_or_hr())
  WITH CHECK (public.is_payroll_admin_or_hr());

-- 6. Seed Initial Payroll Periods
INSERT INTO public.payroll_periods (id, name, start_date, end_date, payout_date, status) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Sep 1 – 15, 2026 (1st Half)', '2026-09-01', '2026-09-15', '2026-09-15', 'open'),
  ('00000000-0000-0000-0000-000000000002', 'Sep 16 – 30, 2026 (2nd Half)', '2026-09-16', '2026-09-30', '2026-09-30', 'open'),
  ('00000000-0000-0000-0000-000000000003', 'Aug 16 – 31, 2026 (2nd Half)', '2026-08-16', '2026-08-31', '2026-08-31', 'closed')
ON CONFLICT (id) DO NOTHING;
