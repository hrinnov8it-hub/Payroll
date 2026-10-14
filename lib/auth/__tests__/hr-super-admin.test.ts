import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveAccountRole, getAccountRoleLabel } from '../account-role';
import { assertAdminOrHR, assertEmployeeSelfOrAdmin } from '../permissions';
import { getRolePermissions } from '@/lib/payroll/approval-actions';
import { getAdminProfiles, updateAdminProfileRole } from '@/lib/payroll/settings-actions';

test('HR is Super Admin across account role and permission guards', () => {
  const role = resolveAccountRole('HR.INNOV8IT@gmail.com', 'admin');
  const hr = { id: 'hr-user', email: 'hr.innov8it@gmail.com', role };
  assert.equal(role, 'super_admin');
  assert.equal(getAccountRoleLabel(role), 'Super Admin');
  assert.equal(assertAdminOrHR(hr).allowed, true);
  assert.equal(assertEmployeeSelfOrAdmin(hr, 'another-employee').allowed, true);
  assert.deepEqual(getRolePermissions(role), { canApprove: true, canLock: true, canUnlock: true, canReturnToDraft: true });
  assert.equal(resolveAccountRole('someone@example.com'), 'employee');
  assert.equal(resolveAccountRole('someone@example.com', 'admin'), 'admin');
  assert.equal(getRolePermissions('employee').canApprove, false);
});

test('role list retires System Owner and promotes only the designated HR account', async () => {
  const originalFetch = globalThis.fetch;
  const unexpected: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input));
    if (url.pathname === '/rest/v1/profiles' && (!init?.method || init.method === 'GET')) {
      return Response.json([
        { id: 'legacy-owner', email: 'superadmin.innov8it@gmail.com', full_name: 'Innov8IT System Owner', role: 'super_admin' },
        { id: 'actual-hr', email: 'hr.innov8it@gmail.com', full_name: 'HR Administrator', role: 'admin' },
        { id: 'other-admin', email: 'admin@example.com', full_name: 'Admin', role: 'admin' },
      ]);
    }
    unexpected.push(url.pathname);
    throw new Error('Unexpected request in isolated role test');
  };
  try {
    const profiles = await getAdminProfiles();
    assert.equal(profiles.length, 2);
    assert.equal(profiles.some((profile) => profile.email === 'superadmin.innov8it@gmail.com'), false);
    assert.equal(profiles.find((profile) => profile.id === 'actual-hr')?.role, 'super_admin');
    assert.equal(profiles.find((profile) => profile.id === 'other-admin')?.role, 'admin');
    assert.equal((await updateAdminProfileRole('actual-hr', 'employee')).success, false);
    assert.deepEqual(unexpected, []);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
