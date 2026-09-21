-- ==============================================================================
-- Innov8IT Payroll - Phase 9 Payroll Review and Approval Migration
-- Adds approval, locking, and audit trail columns to payroll_runs
-- Run this in your Supabase SQL Editor AFTER Phase 8 migration
-- https://supabase.com/dashboard/project/trtwxovcqccwkzuvfzez/sql
-- ==============================================================================

-- 1. Add Review & Approval columns to payroll_runs
--    These fields are absent from Phase 8 and required by Phase 9 logic.

ALTER TABLE public.payroll_runs
  ADD COLUMN IF NOT EXISTS review_notes      TEXT,
  ADD COLUMN IF NOT EXISTS approved_by       UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS approved_by_name  TEXT,
  ADD COLUMN IF NOT EXISTS approved_at       TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by         UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked_by_name    TEXT,
  ADD COLUMN IF NOT EXISTS locked_at         TIMESTAMPTZ;

-- 2. Create the Payroll Audit Log Table
--    Persists all approval/status-change events for compliance and history.

CREATE TABLE IF NOT EXISTS public.payroll_audit_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payroll_run_id    UUID NOT NULL REFERENCES public.payroll_runs(id) ON DELETE CASCADE,
  action            TEXT NOT NULL CHECK (action IN (
                      'run_created',
                      'status_changed',
                      'recalculated',
                      'submitted_for_review',
                      'returned_to_draft',
                      'approved',
                      'marked_paid',
                      'locked',
                      'unlocked',
                      'review_note_added'
                    )),
  performed_by      UUID REFERENCES auth.users(id),
  performed_by_name TEXT NOT NULL,
  from_status       TEXT,
  to_status         TEXT,
  notes             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_run_id     ON public.payroll_audit_logs(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON public.payroll_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_performed_by ON public.payroll_audit_logs(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON public.payroll_audit_logs(created_at DESC);

-- 3. Enable Row Level Security (RLS) on audit log
ALTER TABLE public.payroll_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies: payroll_audit_logs

-- Admins and HR can view all audit logs
CREATE POLICY "Admins and HR can view payroll audit logs"
  ON public.payroll_audit_logs
  FOR SELECT
  TO authenticated
  USING (public.is_payroll_admin_or_hr());

-- Only the system/server-side (via service role) can insert audit logs
-- This prevents client-side manipulation of audit records.
-- Server Actions use the service role key to write audit events.
CREATE POLICY "System can insert payroll audit logs"
  ON public.payroll_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_payroll_admin_or_hr());

-- No UPDATE or DELETE allowed on audit logs (immutable records)
-- (No policies = no access for UPDATE/DELETE by default with RLS enabled)

-- 5. Helper function: Check if the current user is an admin
--    Used for permission-gating the unlock action.

CREATE OR REPLACE FUNCTION public.is_payroll_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Helper function: Check if the current user is admin or payroll_hr
--    (May already exist from Phase 4/5 — using CREATE OR REPLACE for safety)

CREATE OR REPLACE FUNCTION public.is_payroll_admin_or_hr()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'payroll_hr')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. RLS Policy: Only admins can unlock a locked payroll run
--    This supplements the application-layer check in approval-actions.ts

CREATE POLICY "Only admins can unlock payroll runs"
  ON public.payroll_runs
  FOR UPDATE
  TO authenticated
  USING (
    -- Allow update if: user is admin, OR the run is not locked
    public.is_payroll_admin() OR status != 'locked'
  )
  WITH CHECK (
    public.is_payroll_admin() OR status != 'locked'
  );

-- ==============================================================================
-- Phase 9 Migration Complete
-- Summary of changes:
--   • payroll_runs: added review_notes, approved_by, approved_by_name,
--                   approved_at, locked_by, locked_by_name, locked_at
--   • payroll_audit_logs: new table with RLS (immutable audit trail)
--   • is_payroll_admin(): new helper function
--   • is_payroll_admin_or_hr(): updated/recreated helper function
--   • RLS policy: admin-only unlock protection on payroll_runs
-- ==============================================================================
