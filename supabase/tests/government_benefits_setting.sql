-- Check the saved toggle as the HR admin and enforce employee read-only access.
-- All changes to existing settings and roles are rolled back.
BEGIN;
SELECT set_config('request.jwt.claim.sub',
  (SELECT id::text FROM auth.users WHERE lower(email) = 'hr.innov8it@gmail.com'), true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE settings_id uuid; stored boolean;
BEGIN
  SELECT id INTO settings_id FROM public.payroll_settings ORDER BY updated_at DESC LIMIT 1;
  IF settings_id IS NULL THEN RAISE EXCEPTION 'Saved payroll settings are required'; END IF;
  UPDATE public.payroll_settings SET enable_statutory_deductions = false WHERE id = settings_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'HR must be able to save benefit settings'; END IF;
  SELECT enable_statutory_deductions INTO stored FROM public.payroll_settings WHERE id = settings_id;
  IF stored IS DISTINCT FROM false THEN RAISE EXCEPTION 'Disabled setting must round-trip'; END IF;
  UPDATE public.payroll_settings SET enable_statutory_deductions = true WHERE id = settings_id;
  SELECT enable_statutory_deductions INTO stored FROM public.payroll_settings WHERE id = settings_id;
  IF stored IS DISTINCT FROM true THEN RAISE EXCEPTION 'Enabled setting must round-trip'; END IF;
END;
$$;
RESET ROLE;
UPDATE public.profiles SET role = 'employee' WHERE id = auth.uid();
SET LOCAL ROLE authenticated;
DO $$
DECLARE affected bigint;
BEGIN
  UPDATE public.payroll_settings SET enable_statutory_deductions = false;
  GET DIAGNOSTICS affected = ROW_COUNT;
  IF affected <> 0 THEN RAISE EXCEPTION 'Employees must not change benefit settings'; END IF;
END;
$$;
RESET ROLE;
ROLLBACK;
SELECT 'Government benefit setting: enabled/disabled round-trip and employee access checks passed; changes rolled back.' AS result;
