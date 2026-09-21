import { createClient } from '@/lib/supabase/client';

export interface AuditEventInput {
  action: string;
  entity_type: string;
  entity_id: string;
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: string | null;
  details?: Record<string, any> | null;
  ip_address?: string | null;
}

export interface AuditLogRecord extends AuditEventInput {
  id: string;
  created_at: string;
}

// In-memory fallback trail for demo / offline mode
const localAuditLogs: AuditLogRecord[] = [
  {
    id: 'audit-001',
    action: 'payroll_run_created',
    entity_type: 'payroll_run',
    entity_id: 'run-seed-001',
    actor_id: 'usr-admin-01',
    actor_email: 'hr.innov8it@gmail.com',
    actor_role: 'admin',
    details: { run_number: 'PR-202609-01', total_employees: 4 },
    ip_address: '127.0.0.1',
    created_at: '2026-09-15T08:00:00Z',
  },
  {
    id: 'audit-002',
    action: 'payroll_run_approved',
    entity_type: 'payroll_run',
    entity_id: 'run-seed-001',
    actor_id: 'usr-admin-01',
    actor_email: 'hr.innov8it@gmail.com',
    actor_role: 'admin',
    details: { run_number: 'PR-202609-01', approved_by: 'Innov8IT HR Admin' },
    ip_address: '127.0.0.1',
    created_at: '2026-09-15T08:30:00Z',
  },
];

/**
 * Logs a security or operational event to the audit log trail
 */
export async function logAuditEvent(event: AuditEventInput): Promise<AuditLogRecord> {
  const record: AuditLogRecord = {
    id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    action: event.action,
    entity_type: event.entity_type,
    entity_id: event.entity_id,
    actor_id: event.actor_id || null,
    actor_email: event.actor_email || 'system@innov8it.ph',
    actor_role: event.actor_role || 'system',
    details: event.details || {},
    ip_address: event.ip_address || '127.0.0.1',
    created_at: new Date().toISOString(),
  };

  try {
    const supabase = createClient();
    await (supabase as any).from('audit_logs').insert({
      action: record.action,
      entity_type: record.entity_type,
      entity_id: record.entity_id,
      actor_id: record.actor_id,
      actor_email: record.actor_email,
      actor_role: record.actor_role,
      details: record.details,
      ip_address: record.ip_address,
    });
  } catch (err) {
    // Non-blocking fallback
  }

  localAuditLogs.unshift(record);
  return record;
}

/**
 * Retrieves audit log trail for administrative review
 */
export async function getAuditLogs(limit = 50): Promise<AuditLogRecord[]> {
  try {
    const supabase = createClient();
    const { data, error } = await (supabase as any)
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (!error && data && data.length > 0) {
      return data as AuditLogRecord[];
    }
  } catch {
    // Fallback
  }

  return localAuditLogs.slice(0, limit);
}
