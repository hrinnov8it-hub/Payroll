-- Authenticated payroll access for the existing Innov8IT project.
-- Privileged roles are stored in profiles, never supplied by user_metadata.
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.payroll_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.role::text FROM public.profiles p
  WHERE auth.uid() IS NOT NULL AND p.id = auth.uid()
$$;
REVOKE ALL ON FUNCTION private.payroll_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.payroll_role() TO authenticated;

CREATE OR REPLACE FUNCTION private.owns_employee(target_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.employees e JOIN auth.users u ON lower(e.email) = lower(u.email)
    WHERE e.id = target_id AND u.id = auth.uid() AND u.email_confirmed_at IS NOT NULL
  )
$$;
REVOKE ALL ON FUNCTION private.owns_employee(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.owns_employee(uuid) TO authenticated;

-- Compatibility helpers for existing policies and integrations.
CREATE OR REPLACE FUNCTION public.is_payroll_admin_or_hr()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT coalesce(private.payroll_role() IN ('super_admin', 'admin', 'payroll_hr'), false) $$;
CREATE OR REPLACE FUNCTION public.is_payroll_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $$ SELECT coalesce(private.payroll_role() IN ('super_admin', 'admin'), false) $$;
REVOKE ALL ON FUNCTION public.is_payroll_admin_or_hr(), public.is_payroll_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_payroll_admin_or_hr(), public.is_payroll_admin() TO authenticated;

-- New registrations always start as employees, irrespective of supplied metadata.
CREATE OR REPLACE FUNCTION private.handle_new_payroll_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, coalesce(NEW.email, ''), coalesce(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)), 'employee')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.handle_new_payroll_user() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION private.handle_new_payroll_user();
DROP FUNCTION public.handle_new_user();

-- Restore missing profiles without changing existing users' roles or passwords.
INSERT INTO public.profiles (id, email, full_name, role)
SELECT id, coalesce(email, ''), coalesce(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 'employee'
FROM auth.users ON CONFLICT (id) DO NOTHING;

-- Preserve the repository's designated, confirmed HR administrator.
UPDATE public.profiles p SET role = 'super_admin', updated_at = now()
FROM auth.users u
WHERE p.id = u.id AND lower(u.email) = 'hr.innov8it@gmail.com' AND u.email_confirmed_at IS NOT NULL;

-- Replace recursive / permissive legacy policies as one atomic change.
DO $$
DECLARE item record;
BEGIN
  FOR item IN SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename = ANY (ARRAY[
      'profiles', 'departments', 'positions', 'employees', 'payroll_settings',
      'earning_types', 'deduction_types', 'payroll_periods', 'attendance',
      'payroll_runs', 'payroll_run_items', 'payslips', 'payroll_audit_logs'])
  LOOP
    EXECUTE format('DROP POLICY %I ON public.%I', item.policyname, item.tablename);
  END LOOP;
  FOR item IN SELECT unnest(ARRAY[
      'profiles', 'departments', 'positions', 'employees', 'payroll_settings',
      'earning_types', 'deduction_types', 'payroll_periods', 'attendance',
      'payroll_runs', 'payroll_run_items', 'payslips', 'payroll_audit_logs']) AS tablename
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', item.tablename);
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated', item.tablename);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.%I TO authenticated', item.tablename);
  END LOOP;
END;
$$;

CREATE POLICY profiles_read ON public.profiles FOR SELECT TO authenticated
USING (id = (SELECT auth.uid()) OR (SELECT public.is_payroll_admin_or_hr()));
-- No self-update policy can change roles. Only an existing Super Admin manages profiles.
CREATE POLICY profiles_manage ON public.profiles FOR ALL TO authenticated
USING ((SELECT private.payroll_role()) = 'super_admin')
WITH CHECK ((SELECT private.payroll_role()) = 'super_admin');

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['departments', 'positions', 'earning_types', 'deduction_types', 'payroll_settings', 'payroll_periods']
  LOOP
    EXECUTE format('CREATE POLICY reference_read ON public.%I FOR SELECT TO authenticated USING ((SELECT auth.uid()) IS NOT NULL)', table_name);
    EXECUTE format('CREATE POLICY reference_insert ON public.%I FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_payroll_admin_or_hr()))', table_name);
    EXECUTE format('CREATE POLICY reference_update ON public.%I FOR UPDATE TO authenticated USING ((SELECT public.is_payroll_admin_or_hr())) WITH CHECK ((SELECT public.is_payroll_admin_or_hr()))', table_name);
    EXECUTE format('CREATE POLICY reference_delete ON public.%I FOR DELETE TO authenticated USING ((SELECT public.is_payroll_admin()))', table_name);
  END LOOP;
END;
$$;

CREATE POLICY employee_read ON public.employees FOR SELECT TO authenticated
USING ((SELECT public.is_payroll_admin_or_hr()) OR private.owns_employee(id));
CREATE POLICY employee_insert ON public.employees FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_payroll_admin_or_hr()));
CREATE POLICY employee_update ON public.employees FOR UPDATE TO authenticated
USING ((SELECT public.is_payroll_admin_or_hr())) WITH CHECK ((SELECT public.is_payroll_admin_or_hr()));
CREATE POLICY employee_delete ON public.employees FOR DELETE TO authenticated
USING ((SELECT public.is_payroll_admin()));

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['attendance', 'payroll_run_items', 'payslips']
  LOOP
    EXECUTE format('CREATE POLICY payroll_staff_manage ON public.%I FOR ALL TO authenticated USING ((SELECT public.is_payroll_admin_or_hr())) WITH CHECK ((SELECT public.is_payroll_admin_or_hr()))', table_name);
    EXECUTE format('CREATE POLICY employee_read ON public.%I FOR SELECT TO authenticated USING (private.owns_employee(employee_id))', table_name);
  END LOOP;
END;
$$;

CREATE POLICY payroll_runs_manage ON public.payroll_runs FOR ALL TO authenticated
USING ((SELECT public.is_payroll_admin_or_hr())) WITH CHECK ((SELECT public.is_payroll_admin_or_hr()));
-- Run metadata is joined by the employee's own payslip; unrelated runs stay private.
CREATE POLICY payroll_runs_employee_read ON public.payroll_runs FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.payroll_run_items i WHERE i.payroll_run_id = payroll_runs.id AND private.owns_employee(i.employee_id)));

-- A restrictive policy cannot be bypassed by another permissive UPDATE policy.
CREATE POLICY locked_run_updates ON public.payroll_runs AS RESTRICTIVE FOR UPDATE TO authenticated
USING (status <> 'locked' OR (SELECT public.is_payroll_admin()))
WITH CHECK (status <> 'locked' OR (SELECT public.is_payroll_admin()));

CREATE POLICY payslip_mark_viewed ON public.payslips FOR UPDATE TO authenticated
USING (private.owns_employee(employee_id) AND status IN ('published', 'viewed'))
WITH CHECK (private.owns_employee(employee_id) AND status = 'viewed');

CREATE OR REPLACE FUNCTION private.guard_payslip_update()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.is_payroll_admin_or_hr() AND (
    (to_jsonb(NEW) - ARRAY['status', 'viewed_at', 'updated_at']) IS DISTINCT FROM
    (to_jsonb(OLD) - ARRAY['status', 'viewed_at', 'updated_at'])
    OR NEW.status <> 'viewed'
  ) THEN
    RAISE EXCEPTION 'Employees can only mark their own published payslip as viewed' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION private.guard_payslip_update() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS guard_payslip_update ON public.payslips;
CREATE TRIGGER guard_payslip_update BEFORE UPDATE ON public.payslips
FOR EACH ROW EXECUTE FUNCTION private.guard_payslip_update();

REVOKE UPDATE, DELETE ON public.payroll_audit_logs FROM authenticated;
CREATE POLICY audit_read ON public.payroll_audit_logs FOR SELECT TO authenticated
USING ((SELECT public.is_payroll_admin_or_hr()));
CREATE POLICY audit_insert ON public.payroll_audit_logs FOR INSERT TO authenticated
WITH CHECK ((SELECT public.is_payroll_admin_or_hr()));

ALTER FUNCTION public.update_timestamp() SET search_path = '';
