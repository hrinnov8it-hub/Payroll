import assert from 'node:assert/strict';
import test from 'node:test';
import { approvePayrollRun, getAuditEventsForRun } from '../approval-actions';
import { resolvePayrollActorName } from '../signatory';
import type { PayrollRunWithItems } from '@/types/payroll';

test('approval saves the configured signatory while retaining actor ID and permissions', async () => {
  const originalFetch = globalThis.fetch;
  let signatoryName = '  Alex Reyes  ';
  const updates: Record<string, unknown>[] = [];
  const unexpectedRequests: string[] = [];
  // Intercept every request so this test never accesses the live database.
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/rest/v1/payroll_settings') {
      return Response.json([{ signatory_name: signatoryName, enable_signatory_on_payslips: false }]);
    }
    if (url.pathname === '/rest/v1/payroll_runs' && init?.method === 'PATCH') {
      updates.push(JSON.parse(String(init.body)));
      return new Response(null, { status: 204 });
    }
    unexpectedRequests.push(`${init?.method || 'GET'} ${url.pathname}`);
    throw new Error('Unexpected request in isolated approval test');
  };

  const run: PayrollRunWithItems = {
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    payroll_period_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    run_number: 'PR-SIGNATORY-TEST', status: 'review',
    total_employees: 0, total_gross_pay: 0, total_deductions: 0, total_net_pay: 0,
    notes: null, created_at: '2026-10-14T00:00:00Z', updated_at: '2026-10-14T00:00:00Z', items: [],
  };
  const actorId = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
  try {
    const result = await approvePayrollRun(run, actorId, 'HR Admin', 'admin');
    assert.equal(result.success, true);
    assert.equal(result.data?.approved_by_name, 'Alex Reyes');
    assert.equal(result.auditEvent?.performed_by_name, 'Alex Reyes');
    assert.equal(result.data?.approved_by, actorId);
    assert.equal(result.auditEvent?.performed_by, actorId);
    assert.equal(updates[0]?.approved_by_name, 'Alex Reyes');
    assert.equal(updates[0]?.approved_at, result.data?.approved_at);
    assert.equal(getAuditEventsForRun(run.id)[0]?.performed_by_name, 'Alex Reyes');

    signatoryName = 'Jamie Cruz';
    const hrResult = await approvePayrollRun({ ...run, id: 'signatory-hr-test' }, actorId, 'HR Admin', 'payroll_hr');
    assert.equal(hrResult.data?.approved_by_name, 'Jamie Cruz');
    assert.equal(hrResult.auditEvent?.performed_by_name, 'Jamie Cruz');

    signatoryName = '   ';
    const fallback = await approvePayrollRun({ ...run, id: 'signatory-fallback-test' }, actorId, 'HR Admin', 'admin');
    assert.equal(fallback.data?.approved_by_name, 'HR Admin');
    assert.equal(fallback.auditEvent?.performed_by_name, 'HR Admin');

    const count = updates.length;
    assert.equal((await approvePayrollRun(run, actorId, 'Employee', 'employee')).success, false);
    assert.equal((await approvePayrollRun({ ...run, status: 'paid' }, actorId, 'HR Admin', 'admin')).success, false);
    assert.equal(updates.length, count);
    assert.deepEqual(unexpectedRequests, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('older HR labels display the signatory and named historical approvers retain their names', () => {
  assert.equal(resolvePayrollActorName('HR Admin', 'Alex Reyes'), 'Alex Reyes');
  assert.equal(resolvePayrollActorName('Maria Santos (HR Admin)', 'Alex Reyes'), 'Alex Reyes');
  assert.equal(resolvePayrollActorName('HR Admin', ''), 'HR Admin');
  assert.equal(resolvePayrollActorName('Jamie Cruz', 'Alex Reyes'), 'Jamie Cruz');
  assert.equal(resolvePayrollActorName('System', 'Alex Reyes'), 'System');
});
