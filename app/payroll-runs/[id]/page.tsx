'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { WorkspaceIcon } from '@/components/ui/Workspace';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  PayrollRunWithItems,
  PayrollRunItem,
  PayrollRunStatus,
  PayrollAuditEvent,
  ApprovalRecord,
} from '@/types/payroll';
import {
  getPayrollRunById,
  recalculatePayrollRun,
  updateLocalRunCache,
  deletePayrollRun,
} from '@/lib/payroll/runs-actions';
import { syncPayslipsFromRun } from '@/lib/payslips/actions';
import { getPayrollSettings } from '@/lib/payroll/settings-actions';
import { getPayrollApprovalName, resolvePayrollActorName } from '@/lib/payroll/signatory';
import { usePortalUser } from '@/lib/auth/use-portal-user';
import { PayrollSnapshotModal } from '@/components/payroll/PayrollSnapshotModal';
import {
  submitForReview,
  returnToDraft,
  approvePayrollRun,
  markAsPaid,
  lockPayrollRun,
  unlockPayrollRun,
  addReviewNote,
  getAuditEventsForRun,
  buildApprovalChain,
  getRolePermissions,
  UserRole,
  updateRunApproverName,
  updateAuditEventName,
  deleteAuditEvent,
} from '@/lib/payroll/approval-actions';

const WORKFLOW_STEPS: PayrollRunStatus[] = [
  'draft',
  'processing',
  'review',
  'approved',
  'paid',
  'locked',
];

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getAuditEntryClass(action: string): string {
  if (action === 'approved') return 'audit-approved';
  if (action === 'locked') return 'audit-locked';
  if (action === 'unlocked') return 'audit-unlocked';
  if (action === 'marked_paid') return 'audit-paid';
  return '';
}

function getAuditActionLabel(action: string): string {
  const map: Record<string, string> = {
    run_created: '🆕 Run Created',
    submitted_for_review: '📋 Submitted for Review',
    returned_to_draft: '↩️ Returned to Draft',
    approved: '✅ Approved',
    marked_paid: '💰 Marked as Paid',
    locked: '🔒 Locked & Archived',
    unlocked: '🔓 Unlocked (Admin)',
    recalculated: '🔄 Recalculated',
    review_note_added: '📌 Review Note Added',
    status_changed: '🔄 Status Changed',
  };
  return map[action] || action;
}

function getApproverRecordActionClass(action: string): string {
  if (action.includes('Approved')) return 'action-approved';
  if (action.includes('Lock')) return 'action-locked';
  if (action.includes('Unlock')) return 'action-unlocked';
  if (action.includes('Paid')) return 'action-paid';
  return '';
}

export default function PayrollRunDetailPage() {
  const router = useRouter();
  const params = useParams();
  const runId = params?.id as string;

  const [run, setRun] = useState<PayrollRunWithItems | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [recalculating, setRecalculating] = useState<boolean>(false);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedItem, setSelectedItem] = useState<PayrollRunItem | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Phase 9: Review & Approval state
  const authenticatedUser = usePortalUser();
  const activeRole = authenticatedUser?.role || 'employee';
  const userName = authenticatedUser?.fullName || authenticatedUser?.email || '';
  const userId = authenticatedUser?.id || '';
  const [editingRecordId, setEditingRecordId] = useState<string | null>(null);
  const [editingNameValue, setEditingNameValue] = useState<string>('');
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [deleteLoading, setDeleteLoading] = useState<boolean>(false);

  const [auditEvents, setAuditEvents] = useState<PayrollAuditEvent[]>([]);
  const [approvalChain, setApprovalChain] = useState<ApprovalRecord[]>([]);
  const [reviewNote, setReviewNote] = useState<string>('');
  const [reviewNoteLoading, setReviewNoteLoading] = useState<boolean>(false);
  const [showApprovalNoteModal, setShowApprovalNoteModal] = useState<boolean>(false);
  const [approvalModalNotes, setApprovalModalNotes] = useState<string>('');
  const [showUnlockModal, setShowUnlockModal] = useState<boolean>(false);
  const [unlockReason, setUnlockReason] = useState<string>('');
  const [showReturnModal, setShowReturnModal] = useState<boolean>(false);
  const [returnReason, setReturnReason] = useState<string>('');

  // Signatory loaded from payroll settings
  const [signatoryName, setSignatoryName] = useState<string>('');
  const [signatoryTitle, setSignatoryTitle] = useState<string>('');
  const [showSignatory, setShowSignatory] = useState<boolean>(false);

  const currentUser = {
    id: userId,
    name: activeRole === 'employee' ? userName : getPayrollApprovalName(userName, signatoryName),
    role: activeRole,
  };
  const permissions = getRolePermissions(activeRole);

  const refreshAuditData = useCallback((id: string) => {
    setAuditEvents(getAuditEventsForRun(id));
    setApprovalChain(buildApprovalChain(id));
  }, []);

  const loadRun = useCallback(async () => {
    if (!runId) return;
    try {
      setLoading(true);
      const [data, settings] = await Promise.all([getPayrollRunById(runId), getPayrollSettings()]);
      setSignatoryName(settings.signatory_name?.trim() || '');
      setSignatoryTitle(settings.signatory_title || '');
      setShowSignatory(settings.enable_signatory_on_payslips ?? false);
      setRun(data);
      if (data) {
        refreshAuditData(data.id);
        if (data.items && data.items.length > 0) {
          syncPayslipsFromRun(data.id, data).catch(() => {});
        }
      }
    } finally {
      setLoading(false);
    }
  }, [runId, refreshAuditData]);

  useEffect(() => {
    loadRun();
  }, [loadRun]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 6000);
  };

  const handleRecalculate = async () => {
    if (!confirm('Recalculate this payroll run? This will refresh all snapshot values using current attendance records.')) return;
    setRecalculating(true);
    setNotification(null);
    try {
      const res = await recalculatePayrollRun(runId);
      if (res.success && res.data) {
        setRun(res.data);
        updateLocalRunCache(res.data);
        if (res.data.items && res.data.items.length > 0) {
          syncPayslipsFromRun(res.data.id, res.data).catch(() => {});
        }
        showNotification('success', 'Payroll run recalculated successfully.');
      } else {
        showNotification('error', res.error || 'Failed to recalculate.');
      }
    } finally {
      setRecalculating(false);
    }
  };

  const handleApprovalAction = async (action: 'submit' | 'approve' | 'paid' | 'lock') => {
    if (!run) return;
    setActionLoading(true);
    setNotification(null);

    let result;
    try {
      if (action === 'submit') {
        result = await submitForReview(run, currentUser.id, currentUser.name, reviewNote || undefined);
      } else if (action === 'approve') {
        result = await approvePayrollRun(run, currentUser.id, currentUser.name, activeRole, approvalModalNotes || undefined);
        setShowApprovalNoteModal(false);
        setApprovalModalNotes('');
      } else if (action === 'paid') {
        result = await markAsPaid(run, currentUser.id, currentUser.name, activeRole);
      } else if (action === 'lock') {
        result = await lockPayrollRun(run, currentUser.id, currentUser.name, activeRole);
      }

      if (result?.success && result.data) {
        setRun(result.data);
        updateLocalRunCache(result.data);
        refreshAuditData(result.data.id);
        if (result.data.items && result.data.items.length > 0) {
          syncPayslipsFromRun(result.data.id, result.data).catch(() => {});
        }
        const labels: Record<string, string> = {
          submit: 'Payroll run submitted for review.',
          approve: 'Payroll run approved. Approver record saved.',
          paid: 'Payroll run marked as paid.',
          lock: 'Payroll run locked and archived.',
        };
        showNotification('success', labels[action]);
      } else {
        showNotification('error', result?.error || 'Action failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleReturnToDraft = async () => {
    if (!run) return;
    setActionLoading(true);
    setNotification(null);
    try {
      const result = await returnToDraft(run, currentUser.id, currentUser.name, activeRole, returnReason || undefined);
      if (result.success && result.data) {
        setRun(result.data);
        updateLocalRunCache(result.data);
        refreshAuditData(result.data.id);
        setShowReturnModal(false);
        setReturnReason('');
        showNotification('success', 'Payroll run returned to draft for corrections.');
      } else {
        showNotification('error', result.error || 'Failed to return to draft.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleAddReviewNote = async () => {
    if (!run || !reviewNote.trim()) return;
    setReviewNoteLoading(true);
    try {
      const result = await addReviewNote(run, currentUser.id, currentUser.name, activeRole, reviewNote);
      if (result.success && result.data) {
        setRun(result.data);
        refreshAuditData(result.data.id);
        setReviewNote('');
        showNotification('success', 'Review note added to audit log.');
      } else {
        showNotification('error', result.error || 'Failed to add note.');
      }
    } finally {
      setReviewNoteLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!run) return;
    setActionLoading(true);
    setNotification(null);
    try {
      const result = await unlockPayrollRun(run, currentUser.id, currentUser.name, activeRole, unlockReason);
      if (result.success && result.data) {
        setRun(result.data);
        updateLocalRunCache(result.data);
        refreshAuditData(result.data.id);
        setShowUnlockModal(false);
        setUnlockReason('');
        showNotification('success', 'Payroll run unlocked. Audit event recorded.');
      } else {
        showNotification('error', result.error || 'Unlock failed.');
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveRecordName = async (record: ApprovalRecord) => {
    if (!editingNameValue.trim() || !record.event_id) return;
    updateAuditEventName(record.event_id, editingNameValue.trim());
    if (run) {
      await updateRunApproverName(run.id, editingNameValue.trim());
      refreshAuditData(run.id);
      const refreshed = await getPayrollRunById(run.id);
      if (refreshed) setRun(refreshed);
    }
    setEditingRecordId(null);
    showNotification('success', 'Approver name saved successfully.');
  };

  const handleDeleteRecord = (record: ApprovalRecord) => {
    if (!record.event_id) return;
    if (!confirm(`Are you sure you want to remove the "${record.action}" entry by ${record.approver_name}?`)) return;
    deleteAuditEvent(record.event_id);
    if (run) {
      refreshAuditData(run.id);
    }
    showNotification('success', 'Approval entry removed.');
  };

  const handleDeleteRun = async () => {
    if (!run) return;
    setDeleteLoading(true);
    try {
      const res = await deletePayrollRun(run.id);
      if (res.success) {
        setShowDeleteModal(false);
        router.push('/payroll-runs');
      } else {
        showNotification('error', res.error || 'Failed to delete payroll run.');
      }
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <AppShell pageTitle="Payroll run details">
        <div style={{ padding: '4rem 0' }}>
          <LoadingState message="Loading payroll run and approval records..." />
        </div>
      </AppShell>
    );
  }

  if (!run) {
    return (
      <AppShell pageTitle="Payroll run details">
        <div style={{ maxWidth: '800px', margin: '3rem auto', textAlign: 'center' }}>
          <EmptyState title="Payroll Run Not Found" description="The requested payroll run could not be found." />
          <div style={{ marginTop: '1.5rem' }}>
            <ButtonLink href="/payroll-runs" variant="primary">Return to Payroll Runs</ButtonLink>
          </div>
        </div>
      </AppShell>
    );
  }

  const filteredItems = (run.items || []).filter((item) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    return (
      item.employee_name_snapshot.toLowerCase().includes(q) ||
      item.employee_number_snapshot.toLowerCase().includes(q) ||
      (item.department_snapshot || '').toLowerCase().includes(q)
    );
  });

  const canRecalculate = run.status === 'draft' || run.status === 'processing';
  const isLocked = run.status === 'locked';

  return (
    <AppShell pageTitle="Payroll run details">
      <div style={{ maxWidth: '1440px', margin: '0 auto', paddingBottom: '3rem' }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: '1rem' }}>
          <Link
            href="/payroll-runs"
            style={{ fontSize: '0.85rem', color: 'var(--brand-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600 }}
          >
            ← Back to All Payroll Runs
          </Link>
        </div>

        {/* Notification */}
        {notification && (
          <div
            className={`alert-box ${notification.type === 'success' ? 'alert-success' : 'alert-error'}`}
            style={{ marginBottom: '1.25rem' }}
          >
            <span>{notification.message}</span>
          </div>
        )}



        {/* Run Header */}
        <div className="workspace-run-header">
<div><div className="workspace-eyebrow">PAYROLL / RUN DETAILS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 style={{ margin: 0, color: 'var(--brand-dark-blue)', fontSize: '1.65rem', fontFamily: 'monospace' }}>
                {run.run_number}
              </h1>
              <Badge variant={
                run.status === 'approved' || run.status === 'paid' ? 'success' :
                run.status === 'review' ? 'brand' :
                run.status === 'locked' ? 'danger' : 'neutral'
              }>
                {run.status.toUpperCase()}
              </Badge>
              <span className={`role-badge role-${activeRole}`}>
                {activeRole === 'super_admin' ? '🛡️ HR / Super Admin' : activeRole === 'admin' ? '🛡️ Admin' : activeRole === 'payroll_hr' ? '🛡️ HR Admin' : '👤 Employee'}
              </span>
            </div>
            <div style={{ marginTop: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <strong>Period:</strong> {run.payroll_period?.name} ({run.payroll_period?.start_date} → {run.payroll_period?.end_date})
              {' • '}<strong>Payout:</strong> {run.payroll_period?.payout_date}
            </div>
            {run.notes && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                <em>Notes: {run.notes}</em>
              </div>
            )}
            {run.approved_by_name && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#15803d', fontWeight: 600 }}>
                ✅ Approved by {resolvePayrollActorName(run.approved_by_name, signatoryName)} on {run.approved_at ? formatDateTime(run.approved_at) : '—'}
              </div>
            )}
            {run.locked_by_name && (
              <div style={{ marginTop: '0.35rem', fontSize: '0.82rem', color: '#991b1b', fontWeight: 600 }}>
                🔒 Locked by {run.locked_by_name} on {run.locked_at ? formatDateTime(run.locked_at) : '—'}
              </div>
            )}
          </div>

          {/* Header Actions */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <ButtonLink href={`/payslips?periodId=${run.payroll_period_id}`} variant="outline" size="sm" leftIcon={<WorkspaceIcon name="document" size={16} />}>
              View Payslips ({run.total_employees})
            </ButtonLink>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              isLoading={recalculating}
              disabled={!canRecalculate}
              title={!canRecalculate ? 'Locked to preserve historical snapshot' : 'Re-evaluate attendance & rates'}
            >
              Recalculate
            </Button>
            <Button
              variant="danger-outline"
              size="sm"
              onClick={() => setShowDeleteModal(true)}
              leftIcon={<WorkspaceIcon name="trash" size={16} />}
            >
              Delete Run
            </Button>
          </div>
        </div>

        {/* Workflow Lifecycle Visualizer */}
        <Card style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem' }}>
          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.65rem' }}>
            Payroll Processing Lifecycle
          </div>
          <div className="workflow-steps">
            {WORKFLOW_STEPS.map((step, idx) => {
              const currentIdx = WORKFLOW_STEPS.indexOf(run.status);
              const isCompleted = idx < currentIdx;
              const isActive = idx === currentIdx;
              return (
                <React.Fragment key={step}>
                  <div className={`workflow-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                    {isCompleted ? '✓ ' : isActive ? '● ' : `${idx + 1}. `}
                    {step}
                  </div>
                  {idx < WORKFLOW_STEPS.length - 1 && <div className="workflow-connector" />}
                </React.Fragment>
              );
            })}
          </div>
        </Card>

        {/* Financial Summary */}
        <div className="attendance-summary-cards" style={{ marginBottom: '1.5rem' }}>
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Employees in Snapshot</span>
            <span className="attendance-metric-value">{run.total_employees}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Captured in this cycle</span>
          </div>
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Gross Pay</span>
            <span className="attendance-metric-value" style={{ color: 'var(--brand-dark-blue)' }}>
              ₱{Number(run.total_gross_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Basic + OT + ND + Holiday</span>
          </div>
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Deductions</span>
            <span className="attendance-metric-value" style={{ color: '#b91c1c' }}>
              ₱{Number(run.total_deductions || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: '#b91c1c' }}>Statutory, attendance, loans</span>
          </div>
          <div className="attendance-metric-card">
            <span className="attendance-metric-label">Total Net Pay</span>
            <span className="attendance-metric-value" style={{ color: 'var(--success)' }}>
              ₱{Number(run.total_net_pay || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--success)' }}>Final bank disbursement</span>
          </div>
        </div>

        {/* ── PHASE 9: REVIEW & APPROVAL PANEL ── */}
        {!permissions.canApprove && !permissions.canLock && !permissions.canReturnToDraft ? (
          <div style={{
            padding: '1rem 1.25rem', background: '#f8fafc', border: '1px solid #e2e8f0',
            borderRadius: 'var(--radius-md)', marginBottom: '1.5rem', fontSize: '0.88rem', color: 'var(--text-muted)'
          }}>
            👤 <strong>Employee view:</strong> Approval actions are restricted to Payroll HR and Admin roles.
          </div>
        ) : (
          <div className="approval-panel">
            <div className="approval-panel-header">
              <div className="approval-panel-title">
                🛡️ Review & Approval Actions
              </div>
              <span style={{ fontSize: '0.78rem', color: '#0369a1' }}>
                All actions are audited and timestamped
              </span>
            </div>

            {/* Active review notes display */}
            {run.review_notes && (
              <div className="review-notes-panel">
                <div className="review-notes-label">📌 Review Notes</div>
                <div className="review-notes-text">{run.review_notes}</div>
              </div>
            )}

            {/* Approval summary (after approval) */}
            {run.approved_by_name && (
              <div className="approval-summary-bar">
                <div className="approval-summary-item">
                  <span className="approval-summary-label">Approved By</span>
                  <span className="approval-summary-value">{resolvePayrollActorName(run.approved_by_name, signatoryName)}</span>
                </div>
                <div className="approval-summary-item">
                  <span className="approval-summary-label">Approved At</span>
                  <span className="approval-summary-value">{run.approved_at ? formatDateTime(run.approved_at) : '—'}</span>
                </div>
                {run.locked_by_name && (
                  <div className="approval-summary-item">
                    <span className="approval-summary-label">Locked By</span>
                    <span className="approval-summary-value">{run.locked_by_name}</span>
                  </div>
                )}
              </div>
            )}

            {/* Approval Action Buttons */}
            <div className="approval-action-row">
              {run.status === 'draft' && (
                <Button
                  id="btn-submit-review"
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprovalAction('submit')}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="document" size={16} />}
                >
                  Submit for Review →
                </Button>
              )}

              {run.status === 'review' && permissions.canReturnToDraft && (
                <Button
                  id="btn-return-draft"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowReturnModal(true)}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="undo" size={16} />}
                >
                  Return to Draft
                </Button>
              )}

              {run.status === 'review' && permissions.canApprove && (
                <Button
                  id="btn-approve"
                  variant="success"
                  size="sm"
                  onClick={() => setShowApprovalNoteModal(true)}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="check" size={16} />}
                >
                  Approve Payroll Run
                </Button>
              )}

              {run.status === 'approved' && permissions.canApprove && (
                <Button
                  id="btn-mark-paid"
                  variant="primary"
                  size="sm"
                  onClick={() => handleApprovalAction('paid')}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="wallet" size={16} />}
                >
                  Disburse & Mark as Paid ₱
                </Button>
              )}

              {run.status === 'paid' && permissions.canLock && (
                <Button
                  id="btn-lock"
                  variant="outline"
                  size="sm"
                  onClick={() => handleApprovalAction('lock')}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="lock" size={16} />}
                >
                  Lock & Archive Run
                </Button>
              )}

              {run.status === 'locked' && permissions.canUnlock && (
                <Button
                  id="btn-unlock"
                  variant="danger-outline"
                  size="sm"
                  onClick={() => setShowUnlockModal(true)}
                  isLoading={actionLoading}
                  leftIcon={<WorkspaceIcon name="unlock" size={16} />}
                >
                  Unlock Run (HR Admin)
                </Button>
              )}

              {run.status === 'locked' && !permissions.canUnlock && (
                <div style={{ fontSize: '0.85rem', color: '#991b1b', fontWeight: 600, padding: '0.4rem 0.75rem', background: '#fef2f2', borderRadius: 'var(--radius-sm)', border: '1px solid #fecaca' }}>
                  🔒 Run is locked. Historical records preserved.
                </div>
              )}
            </div>

            {/* Review Note Entry */}
            {(run.status === 'draft' || run.status === 'review') && (
              <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                  <Input
                    id="review-note-input"
                    placeholder="Add a review note or comment for this payroll run..."
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                  />
                </div>
                <Button
                  id="btn-add-note"
                  variant="outline"
                  size="sm"
                  onClick={handleAddReviewNote}
                  isLoading={reviewNoteLoading}
                  disabled={!reviewNote.trim()}
                >
                  Add Note
                </Button>
              </div>
            )}

            {/* Admin Unlock Danger Zone */}
            {isLocked && (activeRole === 'super_admin' || activeRole === 'admin') && (
              <div className="danger-zone-panel">
                <div className="danger-zone-title">
                  ⚠️ Admin Danger Zone — Unlock Payroll Run
                </div>
                <div className="danger-zone-description">
                  Unlocking a locked run restores it to PAID status for corrections.
                  This action is restricted to administrators, requires a documented reason,
                  and is permanently recorded in the audit log.
                </div>
                <Button
                  id="btn-unlock"
                  variant="danger-outline"
                  size="sm"
                  onClick={() => setShowUnlockModal(true)}
                  leftIcon={<WorkspaceIcon name="unlock" size={16} />}
                >
                  Unlock Run (Admin Only)
                </Button>
              </div>
            )}
          </div>
        )}


        {/* Authorized Signatory Panel — reflects Super Admin Settings */}
        {showSignatory && signatoryName && (
          <Card style={{ marginBottom: '1.5rem', padding: '1.25rem', borderLeft: '3px solid var(--brand-blue)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.3rem' }}>✍️</span>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)', fontSize: '0.9rem' }}>
                  Authorized Signatory
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.95rem', marginTop: '2px' }}>{signatoryName}</div>
                {signatoryTitle && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{signatoryTitle}</div>
                )}
              </div>
            </div>
          </Card>
        )}

        {/* Audit Log Timeline */}
        {auditEvents.length > 0 && (
          <Card style={{ marginBottom: '1.5rem', padding: '1.25rem' }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              📋 Audit Event Log
              <span style={{ fontWeight: 400, fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>
                ({auditEvents.length} events recorded)
              </span>
            </div>
            <div className="audit-log-timeline">
              {auditEvents.map((event) => (
                <div
                  key={event.id}
                  className={`audit-log-entry ${getAuditEntryClass(event.action)}`}
                >
                  <div className="audit-log-action">{getAuditActionLabel(event.action)}</div>
                  <div className="audit-log-by">By: <strong>{resolvePayrollActorName(event.performed_by_name, signatoryName)}</strong></div>
                  {event.from_status && event.to_status && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      {event.from_status.toUpperCase()} → {event.to_status.toUpperCase()}
                    </div>
                  )}
                  {event.notes && (
                    <div className="audit-log-note">{event.notes}</div>
                  )}
                  <div className="audit-log-timestamp">{formatDateTime(event.created_at)}</div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Employee Snapshot Filter Bar */}
        <Card style={{ marginBottom: '1.25rem', padding: '1rem 1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
            <div style={{ width: '320px' }}>
              <Input
                id="snapshot-search"
                placeholder="Search by employee or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing <strong>{filteredItems.length}</strong> of <strong>{(run.items || []).length}</strong> employee snapshots
            </div>
          </div>
        </Card>

        {/* Snapshot Review Table */}
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, color: 'var(--brand-dark-blue)' }}>
              Employee Payroll Breakdown — {run.run_number}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {isLocked ? '🔒 Historical Freeze — Read Only' : '📸 Active Snapshot'}
            </div>
          </div>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Employee Snapshot</TableHeaderCell>
                  <TableHeaderCell>Time Logs</TableHeaderCell>
                  <TableHeaderCell>Basic Pay</TableHeaderCell>
                  <TableHeaderCell>Overtime & ND</TableHeaderCell>
                  <TableHeaderCell>Holiday / Premiums</TableHeaderCell>
                  <TableHeaderCell>Gross Pay</TableHeaderCell>
                  <TableHeaderCell>Deductions</TableHeaderCell>
                  <TableHeaderCell>Net Pay</TableHeaderCell>
                  <TableHeaderCell align="right">Details</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9}>
                      <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                        No snapshot items match the search.
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredItems.map((item) => {
                    const otNdTotal = Number(item.overtime_pay || 0) + Number(item.night_diff_pay || 0);
                    const holidayTotal = Number(item.holiday_pay || 0) + Number(item.rest_day_pay || 0);
                    return (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--brand-dark-blue)' }}>
                              {item.employee_name_snapshot}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', gap: '0.4rem', marginTop: '2px' }}>
                              <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontWeight: 600 }}>
                                {item.employee_number_snapshot}
                              </span>
                              <span>•</span>
                              <span>{item.department_snapshot || '—'}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div style={{ fontSize: '0.82rem', fontFamily: 'monospace' }}>
                            <div>{item.days_worked}d / {item.regular_hours}h</div>
                            {(item.overtime_hours > 0 || item.night_diff_hours > 0) && (
                              <div style={{ color: 'var(--brand-blue)' }}>
                                +{item.overtime_hours}h OT{item.night_diff_hours > 0 ? ` | +${item.night_diff_hours}h ND` : ''}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="money-cell">
                            ₱{Number(item.basic_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {otNdTotal > 0 ? (
                            <span className="money-cell" style={{ color: '#1d4ed8' }}>
                              +₱{otNdTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {holidayTotal > 0 ? (
                            <span className="money-cell" style={{ color: '#047857' }}>
                              +₱{holidayTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="money-cell money-positive">
                            ₱{Number(item.gross_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell>
                          {Number(item.total_deductions) > 0 ? (
                            <span className="money-cell money-deduction">
                              -₱{Number(item.total_deductions).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--success)', fontSize: '0.8rem', fontWeight: 600 }}>₱0.00</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="money-cell money-net">
                            ₱{Number(item.net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        </TableCell>
                        <TableCell align="right">
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            <Button
                              id={`btn-breakdown-${item.id}`}
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedItem(item)}
                              leftIcon={<WorkspaceIcon name="eye" size={16} />}
                            >
                              View Snapshot
                            </Button>
                            <ButtonLink href={`/payslips/ps-${item.id}`} id={`btn-payslip-${item.id}`} variant="accent" size="sm">
                              Payslip
                            </ButtonLink>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* ── Modal: Granular Snapshot Breakdown ── */}
        {selectedItem && (
          <PayrollSnapshotModal
            isOpen={!!selectedItem}
            onClose={() => setSelectedItem(null)}
            items={run.items || [selectedItem]}
            initialIndex={(run.items || []).findIndex((i) => i.id === selectedItem.id) >= 0 ? (run.items || []).findIndex((i) => i.id === selectedItem.id) : 0}
          />
        )}

        {/* ── Modal: Approval with Notes ── */}
        <Modal
          isOpen={showApprovalNoteModal}
          onClose={() => { setShowApprovalNoteModal(false); setApprovalModalNotes(''); }}
          title="✅ Approve Payroll Run"
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => { setShowApprovalNoteModal(false); setApprovalModalNotes(''); }}>
                Cancel
              </Button>
              <Button
                variant="success"
                size="sm"
                isLoading={actionLoading}
                onClick={() => handleApprovalAction('approve')}

              >
                Confirm Approval
              </Button>
            </div>
          }
        >
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              You are about to <strong>approve</strong> payroll run <strong>{run.run_number}</strong> for{' '}
              <strong>₱{Number(run.total_net_pay).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong> net pay.
              Your name and timestamp will be permanently recorded.
            </p>
            <Input
              id="approval-notes"
              placeholder="Optional: approval notes or remarks..."
              value={approvalModalNotes}
              onChange={(e) => setApprovalModalNotes(e.target.value)}
            />
          </div>
        </Modal>

        {/* ── Modal: Return to Draft ── */}
        <Modal
          isOpen={showReturnModal}
          onClose={() => { setShowReturnModal(false); setReturnReason(''); }}
          title="↩️ Return Payroll Run to Draft"
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => { setShowReturnModal(false); setReturnReason(''); }}>Cancel</Button>
              <Button variant="primary" size="sm" isLoading={actionLoading} onClick={handleReturnToDraft}>
                Return to Draft
              </Button>
            </div>
          }
        >
          <div>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              This will revert the run back to DRAFT status for corrections. Reason (optional):
            </p>
            <Input
              id="return-reason"
              placeholder="Reason for returning to draft..."
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
            />
          </div>
        </Modal>

        {/* ── Modal: Admin Unlock ── */}
        <Modal
          isOpen={showUnlockModal}
          onClose={() => { setShowUnlockModal(false); setUnlockReason(''); }}
          title="🔓 Unlock Payroll Run (Admin)"
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => { setShowUnlockModal(false); setUnlockReason(''); }}>Cancel</Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={actionLoading}
                onClick={handleUnlock}

              >
                Confirm Unlock
              </Button>
            </div>
          }
        >
          <div>
            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: '#7f1d1d' }}>
              ⚠️ <strong>This action is audited.</strong> Unlocking a locked payroll run is a high-security operation reserved for administrators only. Your identity and reason will be permanently recorded.
            </div>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
              Unlock Reason <span style={{ color: '#dc2626' }}>*</span> (min. 10 characters)
            </label>
            <Input
              id="unlock-reason"
              placeholder="e.g. Correction required due to payroll period error..."
              value={unlockReason}
              onChange={(e) => setUnlockReason(e.target.value)}
            />
            {unlockReason.length > 0 && unlockReason.length < 10 && (
              <div style={{ fontSize: '0.78rem', color: '#dc2626', marginTop: '0.3rem' }}>
                {10 - unlockReason.length} more character(s) required.
              </div>
            )}
          </div>
        </Modal>

        {/* ── Modal: Delete Payroll Run ── */}
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Confirm Delete Payroll Run"
          size="sm"
          footer={
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <Button variant="outline" size="sm" onClick={() => setShowDeleteModal(false)} disabled={deleteLoading}>
                Cancel
              </Button>
              <Button
                variant="danger"
                size="sm"
                isLoading={deleteLoading}
                onClick={handleDeleteRun}

              >
                Delete Payroll Run
              </Button>
            </div>
          }
        >
          <div>
            <div style={{ padding: '0.75rem 1rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 'var(--radius-md)', marginBottom: '1rem', fontSize: '0.85rem', color: '#7f1d1d' }}>
              ⚠️ Are you sure you want to permanently delete payroll run <strong>{run.run_number}</strong>?
            </div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: 0 }}>
              All calculated employee snapshot records and generated payslips for this cycle will be removed.
            </p>
          </div>
        </Modal>

      </div>
    </AppShell>
  );
}
