-- ==============================================================================
-- Innov8IT Payroll - Phase 5 Payroll Configuration Migration
-- Payroll Settings, Earning Types, Deduction Types, RLS Policies, and Defaults
-- ==============================================================================

-- 1. Create Payroll Settings Table
CREATE TABLE IF NOT EXISTS public.payroll_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL DEFAULT 'Innov8IT Corporation',
  pay_frequency TEXT NOT NULL DEFAULT 'semi_monthly',
  first_cutoff_start_day INT NOT NULL DEFAULT 1,
  first_cutoff_end_day INT NOT NULL DEFAULT 15,
  second_cutoff_start_day INT NOT NULL DEFAULT 16,
  second_cutoff_end_day INT NOT NULL DEFAULT 0, -- 0 represents end of month
  overtime_regular_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.2500, -- 125%
  overtime_rest_day_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.3000, -- 130%
  overtime_holiday_rate NUMERIC(5, 4) NOT NULL DEFAULT 2.0000, -- 200%
  night_diff_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.1000, -- 10%
  night_diff_start_time TIME NOT NULL DEFAULT '22:00:00', -- 10:00 PM
  night_diff_end_time TIME NOT NULL DEFAULT '06:00:00', -- 6:00 AM
  regular_holiday_rate NUMERIC(5, 4) NOT NULL DEFAULT 2.0000, -- 200%
  special_holiday_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.3000, -- 130%
  rest_day_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.3000, -- 130%
  rest_day_special_holiday_rate NUMERIC(5, 4) NOT NULL DEFAULT 1.5000, -- 150%
  rest_day_regular_holiday_rate NUMERIC(5, 4) NOT NULL DEFAULT 2.6000, -- 260%
  standard_working_days_per_year INT NOT NULL DEFAULT 261,
  standard_hours_per_day INT NOT NULL DEFAULT 8,
  grace_period_late_minutes INT NOT NULL DEFAULT 10,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create Earning Types Table
CREATE TABLE IF NOT EXISTS public.earning_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'allowance', -- allowance, bonus, commission, reimbursement, other
  taxable BOOLEAN NOT NULL DEFAULT false,
  is_deminimis BOOLEAN NOT NULL DEFAULT false,
  deminimis_limit NUMERIC(10, 2) DEFAULT 0.00,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Create Deduction Types Table
CREATE TABLE IF NOT EXISTS public.deduction_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'loan', -- loan, statutory, company, insurance, other
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger for payroll_settings updated_at
DROP TRIGGER IF EXISTS trigger_payroll_settings_updated_at ON public.payroll_settings;
CREATE TRIGGER trigger_payroll_settings_updated_at
  BEFORE UPDATE ON public.payroll_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_timestamp();

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earning_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deduction_types ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies: payroll_settings
CREATE POLICY "Authenticated users can view payroll settings"
  ON public.payroll_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and HR can update payroll settings"
  ON public.payroll_settings
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins and HR can insert payroll settings"
  ON public.payroll_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

-- 6. RLS Policies: earning_types
CREATE POLICY "Authenticated users can view earning types"
  ON public.earning_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and HR can insert earning types"
  ON public.earning_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins and HR can update earning types"
  ON public.earning_types
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins can delete earning types"
  ON public.earning_types
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. RLS Policies: deduction_types
CREATE POLICY "Authenticated users can view deduction types"
  ON public.deduction_types
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins and HR can insert deduction types"
  ON public.deduction_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins and HR can update deduction types"
  ON public.deduction_types
  FOR UPDATE
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

CREATE POLICY "Admins can delete deduction types"
  ON public.deduction_types
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 8. Seed Initial Default Payroll Settings
INSERT INTO public.payroll_settings (
  company_name,
  pay_frequency,
  first_cutoff_start_day,
  first_cutoff_end_day,
  second_cutoff_start_day,
  second_cutoff_end_day,
  overtime_regular_rate,
  overtime_rest_day_rate,
  overtime_holiday_rate,
  night_diff_rate,
  regular_holiday_rate,
  special_holiday_rate,
  rest_day_rate,
  rest_day_special_holiday_rate,
  rest_day_regular_holiday_rate,
  standard_working_days_per_year,
  standard_hours_per_day,
  grace_period_late_minutes
) VALUES (
  'Innov8IT Corporation',
  'semi_monthly',
  1,
  15,
  16,
  0,
  1.2500,
  1.3000,
  2.0000,
  0.1000,
  2.0000,
  1.3000,
  1.3000,
  1.5000,
  2.6000,
  261,
  8,
  10
) ON CONFLICT DO NOTHING;

-- 9. Seed Initial Earning Types
INSERT INTO public.earning_types (name, code, category, taxable, is_deminimis, deminimis_limit, description) VALUES
  ('Rice Subsidy', 'RICE', 'allowance', false, true, 2000.00, 'Non-taxable de minimis allowance up to ₱2,000 monthly'),
  ('Internet & Tech Allowance', 'TECH', 'allowance', false, true, 1500.00, 'Work-from-home communication and broadband support'),
  ('Transportation Allowance', 'TRANS', 'allowance', true, false, 0.00, 'Fixed monthly transit support for hybrid employees'),
  ('13th Month Pay', 'BONUS_13TH', 'bonus', false, false, 90000.00, 'Mandatory Philippine statutory year-end benefit (Tax-exempt up to ₱90k)'),
  ('Quarterly Performance Bonus', 'PERF_BONUS', 'bonus', true, false, 0.00, 'Discretionary incentive based on company and individual KPI achievement'),
  ('Talent Referral Incentive', 'REF_BONUS', 'bonus', true, false, 0.00, 'Awarded upon completion of probationary period of referred talent'),
  ('Night Shift Premium Allowance', 'NIGHT_ALLOW', 'allowance', true, false, 0.00, 'Additional allowance for operational overnight shifts')
ON CONFLICT (code) DO NOTHING;

-- 10. Seed Initial Deduction Types
INSERT INTO public.deduction_types (name, code, category, description) VALUES
  ('SSS Salary Loan', 'SSS_LOAN', 'loan', 'Monthly amortization repayment for SSS salary loans'),
  ('Pag-IBIG Multi-Purpose Loan', 'HDMF_MPL', 'loan', 'Monthly amortization for HDMF / Pag-IBIG short-term loan'),
  ('Pag-IBIG Calamity Loan', 'HDMF_CALAMITY', 'loan', 'Disaster relief loan amortization administered via HDMF'),
  ('Company Emergency Loan', 'CO_LOAN', 'loan', 'Internal corporate emergency assistance loan program'),
  ('HMO Dependent Premium', 'HMO_DEP', 'insurance', 'Employee copay share for enrolled secondary dependents on medical insurance'),
  ('Salary / Cash Advance', 'CASH_ADV', 'company', 'Deduction for early payroll cash disbursement advances'),
  ('Uniform & ID Replacement', 'UNIFORM', 'company', 'Administrative replacement charge for security access badges')
ON CONFLICT (code) DO NOTHING;
