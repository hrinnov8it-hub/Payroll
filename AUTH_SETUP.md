# Existing Supabase project

The app uses project `trtwxovcqccwkzuvfzez`. Sign in at `/login` with the existing email and password. The confirmed HR account retains its Super Admin role; no passwords were changed.

Configure `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Existing deployments can keep `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead. The existing `.env.local` works without changes. Never expose a secret or service-role key in a public environment variable.

Staff roles can access the dashboard, employees, attendance, payroll runs, reports, and settings. Employees access their own payslips. Server layouts independently check roles. `POST /api/sync` requires staff access; `POST /api/migrate` requires Super Admin. Middleware validates sessions with Supabase Auth and preserves refreshed cookies on redirects.

All 13 payroll tables have row security enabled and no anonymous table grants. New Auth accounts receive employee profiles automatically; only Super Admin can manage profiles. Employee ownership uses their confirmed Auth email, which should match their employee record. Add accounts through Supabase Authentication > Users.

The migrations `20261015211359` and `20261015211424` are already applied and match the connected project's migration history. Earlier SQL scripts predate tracked migrations; do not replay them against this existing project because they contain legacy policies replaced by these migrations.

Run `npm run test:auth` for session and redirect regression tests. `supabase/tests/auth_access.sql` checks live database permissions using the confirmed HR account; all fixtures and temporary role changes are rolled back. Also run `npm run type-check`, `npm test`, and `npm run build` when validating changes.

The Supabase advisor still reports that leaked-password protection is disabled; it can be enabled in Auth settings if available on the project's plan.
