-- ==============================================================================
-- Innov8IT Payroll - Phase 4 Employee Management Migration
-- Departments, Positions, Employees, Enums, RLS Policies, and Initial Seed Data
-- ==============================================================================

-- 1. Create Enums if they do not exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employment_type') THEN
    CREATE TYPE employment_type AS ENUM ('regular', 'probationary', 'contractual', 'part_time');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'pay_type') THEN
    CREATE TYPE pay_type AS ENUM ('monthly', 'daily', 'hourly');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'employee_status') THEN
    CREATE TYPE employee_status AS ENUM ('active', 'inactive', 'terminated');
  END IF;
END $$;

-- 2. Create Departments Table
CREATE TABLE IF NOT EXISTS public.departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Positions Table
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create Employees Table
CREATE TABLE IF NOT EXISTS public.employees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_number TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
  position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
  employment_type employment_type NOT NULL DEFAULT 'regular',
  pay_type pay_type NOT NULL DEFAULT 'monthly',
  basic_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (basic_salary >= 0),
  hourly_rate NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (hourly_rate >= 0),
  hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status employee_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performant filtering and searching
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON public.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_last_name ON public.employees(last_name);

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employees_updated_at ON public.employees;
CREATE TRIGGER trigger_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user has admin or payroll_hr role
CREATE OR REPLACE FUNCTION public.is_payroll_admin_or_hr()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'payroll_hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policies: Departments
-- All authenticated users can view departments
CREATE POLICY "Authenticated users can view departments"
  ON public.departments
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins and Payroll HR can manage departments
CREATE POLICY "Admins and HR can insert departments"
  ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins and HR can update departments"
  ON public.departments
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins can delete departments"
  ON public.departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. RLS Policies: Positions
-- All authenticated users can view positions
CREATE POLICY "Authenticated users can view positions"
  ON public.positions
  FOR SELECT
  TO authenticated
  USING (true);

-- Admins and Payroll HR can manage positions
CREATE POLICY "Admins and HR can insert positions"
  ON public.positions
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins and HR can update positions"
  ON public.positions
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins can delete positions"
  ON public.positions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 9. RLS Policies: Employees
-- Admin and Payroll HR can view all employees
CREATE POLICY "HR and Admin can view all employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.is_payroll_admin_or_hr() OR
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
  );

-- Admin and Payroll HR can insert employees
CREATE POLICY "HR and Admin can insert employees"
  ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

-- Admin and Payroll HR can update employees
CREATE POLICY "HR and Admin can update employees"
  ON public.employees
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

-- Admin can delete employees
CREATE POLICY "Admins can delete employees"
  ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 10. Initial Seed Data (Departments, Positions, and Sample Employees)
INSERT INTO public.departments (name, code, description) VALUES
  ('Engineering', 'ENG', 'Software development, infrastructure, QA and IT systems'),
  ('Human Resources', 'HR', 'People operations, talent acquisition, and payroll'),
  ('Finance & Accounting', 'FIN', 'Corporate finance, bookkeeping, tax, and auditing'),
  ('Product & Design', 'PRD', 'Product strategy, UI/UX design, and research'),
  ('Operations', 'OPS', 'Client delivery, logistics, and company operations'),
  ('Executive Management', 'EXEC', 'Corporate leadership and strategic planning')
ON CONFLICT (code) DO NOTHING;

-- Seed Positions
INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Senior Software Engineer', 'Leads architecture and core system development'
FROM public.departments d WHERE d.code = 'ENG'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Full Stack Developer', 'Develops web applications and microservices'
FROM public.departments d WHERE d.code = 'ENG'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'QA Automation Engineer', 'Builds automated test suites and quality gates'
FROM public.departments d WHERE d.code = 'ENG'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'HR & Payroll Specialist', 'Manages employee records, benefits, and timekeeping'
FROM public.departments d WHERE d.code = 'HR'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Senior Accountant', 'Oversees general ledger, tax filing, and statutory reports'
FROM public.departments d WHERE d.code = 'FIN'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Product Designer', 'Creates user journeys, wireframes, and design systems'
FROM public.departments d WHERE d.code = 'PRD'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Operations Lead', 'Coordinates customer support and service delivery'
FROM public.departments d WHERE d.code = 'OPS'
ON CONFLICT DO NOTHING;

INSERT INTO public.positions (department_id, title, description)
SELECT d.id, 'Chief Technology Officer', 'Directs enterprise technology roadmap'
FROM public.departments d WHERE d.code = 'EXEC'
ON CONFLICT DO NOTHING;
