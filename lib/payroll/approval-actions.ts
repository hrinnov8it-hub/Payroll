/**
 * Phase 9 — Payroll Review and Approval Actions
 *
 * Handles:
 * - Approval action with approver record and timestamp
 * - Locking with permission check
 * - Permission-controlled unlocking (admin only)
 * - Audit event log (in-memory; can be wired to Supabase in Phase 13)
 *
 * Role hierarchy:
 *   admin           → can approve, lock, and unlock
 *   payroll_hr      → can approve and lock; cannot unlock locked runs
 *   employee        → read-only; no approval or locking capability
 */

import {
  PayrollRunWithItems,
  PayrollRunStatus,
  PayrollAuditEvent,
  PayrollAuditAction,
  ApprovalRecord,
} from '@/types/payroll';

// ==============================================================================
// In-memory audit event store
// In Phase 13 (Audit & Security), this will be persisted to Supabase.
// ==============================================================================

let auditLog: PayrollAuditEvent[] = [
  {
    id: 'audit-seed-001',
    payroll_run_id: 'run-mock-001',
    action: 'run_created',
    performed_by: 'system',
    performed_by_name: 'System',
    from_status: null,
    to_status: 'draft',
    notes: 'Initial payroll run created.',
    created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'audit-seed-002',
    payroll_run_id: 'run-mock-001',
    action: 'submitted_for_review',
    performed_by: 'user-hr-001',
    performed_by_name: 'Maria Santos (HR)',
    from_status: 'draft',
    to_status: 'review',
    notes: null,
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

// ==============================================================================
// Role permission definitions
// ==============================================================================

export type UserRole = 'admin' | 'payroll_hr' | 'employee';

const ROLE_PERMISSIONS: Record<UserRole, {
  canApprove: boolean;
  canLock: boolean;
  canUnlock: boolean;
  canReturnToDraft: boolean;
}> = {
  admin: { canApprove: true, canLock: true, canUnlock: true, canReturnToDraft: true },
  payroll_hr: { canApprove: true, canLock: true, canUnlock: false, canReturnToDraft: true },
  employee: { canApprove: false, canLock: false, canUnlock: false, canReturnToDraft: false },
};

export function getRolePermissions(role: UserRole) {
  return ROLE_PERMISSIONS[role] ?? ROLE_PERMISSIONS.employee;
}

// ==============================================================================
// Audit Log Helpers
// ==============================================================================

function createAuditEvent(
  params: Omit<PayrollAuditEvent, 'id' | 'created_at'>
): PayrollAuditEvent {
  return {
    ...params,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
  };
}

function appendAuditEvent(event: PayrollAuditEvent): void {
  auditLog.unshift(event);
}

export function getAuditEventsForRun(runId: string): PayrollAuditEvent[] {
  return auditLog.filter((e) => e.payroll_run_id === runId);
}

// ==============================================================================
// Approval Actions
// ==============================================================================

export interface ApprovalActionResult {
  success: boolean;
  data?: PayrollRunWithItems;
  error?: string;
  auditEvent?: PayrollAuditEvent;
}

export async function submitForReview(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  reviewNotes?: string
): Promise<ApprovalActionResult> {
  if (run.status !== 'draft') {
    return {
      success: false,
      error: `Cannot submit for review: run is currently in '${run.status.toUpperCase()}' status. Only DRAFT runs can be submitted.`,
    };
  }

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'review',
    review_notes: reviewNotes?.trim() || run.review_notes || null,
    updated_at: new Date().toISOString(),
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'submitted_for_review',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'draft',
    to_status: 'review',
    notes: reviewNotes || null,
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

export async function returnToDraft(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole,
  reason?: string
): Promise<ApprovalActionResult> {
  const permissions = getRolePermissions(role);
  if (!permissions.canReturnToDraft) {
    return { success: false, error: 'Insufficient permissions: only payroll HR or admin can return a run to draft.' };
  }

  if (run.status !== 'review') {
    return {
      success: false,
      error: `Cannot return to draft: run is currently in '${run.status.toUpperCase()}' status. Only REVIEW runs can be returned to draft.`,
    };
  }

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'draft',
    updated_at: new Date().toISOString(),
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'returned_to_draft',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'review',
    to_status: 'draft',
    notes: reason || null,
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

export async function approvePayrollRun(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole,
  approvalNotes?: string
): Promise<ApprovalActionResult> {
  const permissions = getRolePermissions(role);
  if (!permissions.canApprove) {
    return { success: false, error: 'Insufficient permissions: only payroll HR or admin can approve a payroll run.' };
  }

  if (run.status !== 'review') {
    return {
      success: false,
      error: `Cannot approve: run must be in REVIEW status before approval. Current status: '${run.status.toUpperCase()}'.`,
    };
  }

  const approvedAt = new Date().toISOString();

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'approved',
    approved_by: performedBy,
    approved_by_name: performedByName,
    approved_at: approvedAt,
    updated_at: approvedAt,
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'approved',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'review',
    to_status: 'approved',
    notes: approvalNotes || null,
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

export async function markAsPaid(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole
): Promise<ApprovalActionResult> {
  const permissions = getRolePermissions(role);
  if (!permissions.canApprove) {
    return { success: false, error: 'Insufficient permissions: only payroll HR or admin can mark a run as paid.' };
  }

  if (run.status !== 'approved') {
    return {
      success: false,
      error: `Cannot mark as paid: run must be in APPROVED status. Current status: '${run.status.toUpperCase()}'.`,
    };
  }

  const paidAt = new Date().toISOString();

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'paid',
    processed_by: performedBy,
    processed_at: paidAt,
    updated_at: paidAt,
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'marked_paid',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'approved',
    to_status: 'paid',
    notes: null,
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

export async function lockPayrollRun(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole
): Promise<ApprovalActionResult> {
  const permissions = getRolePermissions(role);
  if (!permissions.canLock) {
    return { success: false, error: 'Insufficient permissions: only payroll HR or admin can lock a payroll run.' };
  }

  if (run.status !== 'paid') {
    return {
      success: false,
      error: `Cannot lock: run must be in PAID status before locking. Current status: '${run.status.toUpperCase()}'.`,
    };
  }

  const lockedAt = new Date().toISOString();

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'locked',
    locked_by: performedBy,
    locked_by_name: performedByName,
    locked_at: lockedAt,
    updated_at: lockedAt,
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'locked',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'paid',
    to_status: 'locked',
    notes: 'Run archived and locked. Historical records preserved.',
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

/**
 * Unlock a locked payroll run.
 * CRITICAL: Admin-only. Unlock reason is mandatory and audited.
 */
export async function unlockPayrollRun(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole,
  unlockReason: string
): Promise<ApprovalActionResult> {
  if (role !== 'admin') {
    return {
      success: false,
      error: '🔒 Unlock requires ADMIN permission. This action is restricted to system administrators only.',
    };
  }

  if (run.status !== 'locked') {
    return {
      success: false,
      error: `Cannot unlock: run is not in LOCKED status. Current status: '${run.status.toUpperCase()}'.`,
    };
  }

  if (!unlockReason || unlockReason.trim().length < 10) {
    return {
      success: false,
      error: 'An unlock reason of at least 10 characters is required for audit compliance.',
    };
  }

  const updatedRun: PayrollRunWithItems = {
    ...run,
    status: 'paid',
    locked_by: null,
    locked_by_name: null,
    locked_at: null,
    updated_at: new Date().toISOString(),
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'unlocked',
    performed_by: performedBy,
    performed_by_name: performedByName,
    from_status: 'locked',
    to_status: 'paid',
    notes: `[ADMIN UNLOCK] ${unlockReason.trim()}`,
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

export async function addReviewNote(
  run: PayrollRunWithItems,
  performedBy: string,
  performedByName: string,
  role: UserRole,
  note: string
): Promise<ApprovalActionResult> {
  if (role === 'employee') {
    return { success: false, error: 'Insufficient permissions: employees cannot add review notes.' };
  }

  if (!note || note.trim().length === 0) {
    return { success: false, error: 'Review note cannot be empty.' };
  }

  const updatedRun: PayrollRunWithItems = {
    ...run,
    review_notes: note.trim(),
    updated_at: new Date().toISOString(),
  };

  const event = createAuditEvent({
    payroll_run_id: run.id,
    action: 'review_note_added',
    performed_by: performedBy,
    performed_by_name: performedByName,
    notes: note.trim(),
  });

  appendAuditEvent(event);
  return { success: true, data: updatedRun, auditEvent: event };
}

// ==============================================================================
// Approval Chain Summary
// ==============================================================================

function formatAuditAction(action: PayrollAuditAction): string {
  const labels: Record<PayrollAuditAction, string> = {
    run_created: 'Created Run',
    status_changed: 'Changed Status',
    recalculated: 'Recalculated',
    submitted_for_review: 'Submitted for Review',
    returned_to_draft: 'Returned to Draft',
    approved: 'Approved',
    marked_paid: 'Marked as Paid',
    locked: 'Locked & Archived',
    unlocked: 'Unlocked (Admin)',
    review_note_added: 'Added Review Note',
  };
  return labels[action] || action;
}

export function buildApprovalChain(runId: string): ApprovalRecord[] {
  const events = getAuditEventsForRun(runId);
  const relevantActions: PayrollAuditAction[] = [
    'submitted_for_review',
    'approved',
    'marked_paid',
    'locked',
    'unlocked',
    'returned_to_draft',
  ];

  return events
    .filter((e) => relevantActions.includes(e.action))
    .map((e) => ({
      approver_name: e.performed_by_name,
      approver_role: e.performed_by === 'system' ? 'System' : 'Payroll HR / Admin',
      action: formatAuditAction(e.action),
      timestamp: e.created_at,
      notes: e.notes || null,
    }));
}
