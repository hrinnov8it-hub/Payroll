-- HR is the designated payroll Super Admin. The separate seeded System Owner is retired.
-- Commit enum extension before using the value, including on databases missing the older migration.
BEGIN;
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
COMMIT;

BEGIN;

CREATE OR REPLACE FUNCTION public.is_admin_or_hr()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('super_admin', 'admin', 'payroll_hr')
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Replace older recursive policies with the security-definer helper.
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins view all" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile or admins all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage user profiles" ON public.profiles;
CREATE POLICY "Users can view own profile or admins all" ON public.profiles
  FOR SELECT TO authenticated USING (id = auth.uid() OR public.is_admin_or_hr());
CREATE POLICY "Admins can manage user profiles" ON public.profiles
  FOR ALL TO authenticated USING (public.is_admin_or_hr()) WITH CHECK (public.is_admin_or_hr());

INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, email, COALESCE(raw_user_meta_data->>'full_name', 'HR Administrator'), 'super_admin'
FROM auth.users WHERE lower(email) = 'hr.innov8it@gmail.com'
ON CONFLICT (id) DO UPDATE SET role = 'super_admin', updated_at = now();

UPDATE public.profiles SET role = 'super_admin', updated_at = now()
WHERE lower(email) = 'hr.innov8it@gmail.com';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE lower(email) = 'hr.innov8it@gmail.com' AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'HR profile was not found; System Owner removal cancelled.';
  END IF;
END $$;

-- Remove the role-delegation profile, preserving auth users and historical payroll records.
DELETE FROM public.profiles WHERE lower(email) = 'superadmin.innov8it@gmail.com';

COMMIT;

SELECT email, role FROM public.profiles
WHERE lower(email) IN ('hr.innov8it@gmail.com', 'superadmin.innov8it@gmail.com');
