-- Verify real database roles; all fixture data and role changes are rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE lower(email) = 'hr.innov8it@gmail.com'), true);

INSERT INTO public.employees (employee_number, first_name, last_name, email)
VALUES ('AUTH-ROUTE-TEST-OWN', 'Auth', 'Own', 'hr.innov8it@gmail.com')
ON CONFLICT (email) DO NOTHING;
INSERT INTO public.employees (employee_number, first_name, last_name, email)
VALUES ('AUTH-ROUTE-TEST-OTHER', 'Auth', 'Other', 'auth-route-test-other@example.invalid');

SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF private.payroll_role() IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'The HR account must retain Super Admin access';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE employee_number = 'AUTH-ROUTE-TEST-OTHER') THEN
    RAISE EXCEPTION 'Super Admin must be able to read employee records';
  END IF;
  UPDATE public.employees SET first_name = 'Auth' WHERE employee_number = 'AUTH-ROUTE-TEST-OTHER';
  IF NOT FOUND THEN RAISE EXCEPTION 'Super Admin employee updates must be allowed'; END IF;
  PERFORM 1 FROM public.profiles;
  PERFORM 1 FROM public.payroll_runs;
  PERFORM 1 FROM public.payslips;
END;
$$;

RESET ROLE;
-- Simulate an ordinary employee without creating a new Auth account or changing a password.
UPDATE public.profiles SET role = 'employee' WHERE id = auth.uid();
SET LOCAL ROLE authenticated;
DO $$
DECLARE affected bigint;
BEGIN
  IF public.is_payroll_admin_or_hr() THEN RAISE EXCEPTION 'Employee must not inherit staff access'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.employees WHERE lower(email) = 'hr.innov8it@gmail.com') THEN
    RAISE EXCEPTION 'Employee must be able to read their own record';
  END IF;
  IF EXISTS (SELECT 1 FROM public.employees WHERE lower(email) <> 'hr.innov8it@gmail.com') THEN
    RAISE EXCEPTION 'Employee must not read another employee record';
  END IF;
  UPDATE public.profiles SET role = 'super_admin' WHERE id = auth.uid();
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 OR private.payroll_role() IS DISTINCT FROM 'employee' THEN
    RAISE EXCEPTION 'Employee must not promote their own profile';
  END IF;
  UPDATE public.employees SET first_name = 'Tampered' WHERE employee_number = 'AUTH-ROUTE-TEST-OTHER';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Employee must not modify another employee'; END IF;
  DELETE FROM public.employees WHERE employee_number = 'AUTH-ROUTE-TEST-OTHER';
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Employee must not delete another employee'; END IF;
  BEGIN
    INSERT INTO public.employees (employee_number, first_name, last_name, email)
    VALUES ('AUTH-ROUTE-TEST-DENIED', 'Denied', 'Insert', 'auth-route-test-denied@example.invalid');
    RAISE EXCEPTION 'Employee insertion must be rejected';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;
SET LOCAL ROLE anon;
DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'profiles', 'departments', 'positions', 'employees', 'payroll_settings',
    'earning_types', 'deduction_types', 'payroll_periods', 'attendance',
    'payroll_runs', 'payroll_run_items', 'payslips', 'payroll_audit_logs']
  LOOP
    BEGIN
      EXECUTE format('SELECT 1 FROM public.%I LIMIT 1', table_name);
      RAISE EXCEPTION 'Anonymous access must be rejected for %', table_name;
    EXCEPTION WHEN insufficient_privilege THEN NULL;
    END;
  END LOOP;
END;
$$;
ROLLBACK;
SELECT 'PASS: HR access, employee ownership, role escalation, denied writes, and anonymous access; fixtures rolled back' AS verification;
