import {
  assertUserAuthenticated,
  assertAdminOrHR,
  assertEmployeeSelfOrAdmin,
  sanitizeInputString,
  validateEmail,
  maskPII,
  maskBankAccount,
  UserContext,
} from '../permissions';
import { logAuditEvent, getAuditLogs } from '../../audit/logger';

export async function runSecurityHardeningTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`✓ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // Sample Personas
  const adminUser: UserContext = {
    id: 'usr-admin-001',
    email: 'alexander.wright@innov8it.ph',
    role: 'admin',
    name: 'Alexander Wright',
  };

  const hrUser: UserContext = {
    id: 'usr-hr-001',
    email: 'maria.santos@innov8it.ph',
    role: 'payroll_hr',
    name: 'Maria Santos',
  };

  const emp1User: UserContext = {
    id: 'usr-emp-001',
    email: 'juan.delacruz@innov8it.ph',
    role: 'employee',
    employee_id: 'emp-001',
    name: 'Juan Dela Cruz',
  };

  const emp2User: UserContext = {
    id: 'usr-emp-002',
    email: 'ana.reyes@innov8it.ph',
    role: 'employee',
    employee_id: 'emp-002',
    name: 'Ana Patricia Reyes',
  };

  // 1. Authentication Assertion Tests
  const nullAuth = assertUserAuthenticated(null);
  assert(nullAuth.allowed === false && nullAuth.statusCode === 401, 'Unauthenticated user rejected (401)', `Got status ${nullAuth.statusCode}`);

  const validAuth = assertUserAuthenticated(emp1User);
  assert(validAuth.allowed === true && validAuth.statusCode === 200, 'Authenticated user accepted (200)');

  // 2. Admin & HR RBAC Permission Guard Tests
  const adminPerm = assertAdminOrHR(adminUser);
  assert(adminPerm.allowed === true, 'Admin role granted administrative access');

  const hrPerm = assertAdminOrHR(hrUser);
  assert(hrPerm.allowed === true, 'HR Manager role granted administrative access');

  const empPerm = assertAdminOrHR(emp1User);
  assert(empPerm.allowed === false && empPerm.statusCode === 403, 'Employee role blocked from administrative access (403)', `Got status ${empPerm.statusCode}`);

  // 3. Employee Self vs Cross-Access Tests (Phase 10 & Phase 13 Isolation)
  const selfAccess = assertEmployeeSelfOrAdmin(emp1User, 'emp-001');
  assert(selfAccess.allowed === true, 'Employee allowed access to own record (emp-001)');

  const crossAccess = assertEmployeeSelfOrAdmin(emp1User, 'emp-002');
  assert(crossAccess.allowed === false && crossAccess.statusCode === 403, 'Employee blocked from accessing another employee record (403 Forbidden)', `Got status ${crossAccess.statusCode}`);

  const adminCrossAccess = assertEmployeeSelfOrAdmin(adminUser, 'emp-002');
  assert(adminCrossAccess.allowed === true, 'Admin allowed access to any employee record');

  // 4. Input Sanitization & Email Validation
  const dirtyInput = "<script>alert('XSS Attack!')</script>Hello <b>World</b>";
  const cleanInput = sanitizeInputString(dirtyInput);
  assert(!cleanInput.includes('<script>'), 'Sanitizer strips script tags');
  assert(!cleanInput.includes('<b>'), 'Sanitizer strips HTML tags');

  assert(validateEmail('juan.delacruz@innov8it.ph') === true, 'Valid email accepted');
  assert(validateEmail('invalid-email-address') === false, 'Invalid email rejected');

  // 5. PII & Bank Account Data Masking
  const sssNumber = '12-3456789-0';
  const maskedSSS = maskPII(sssNumber, 4);
  assert(maskedSSS.endsWith('7890'), 'PII Masking preserves last 4 digits', `Got ${maskedSSS}`);
  assert(maskedSSS.startsWith('*'), 'PII Masking obfuscates initial digits', `Got ${maskedSSS}`);

  const bankAcc = '9876543210';
  const maskedBank = maskBankAccount(bankAcc);
  assert(maskedBank === '******3210', 'Bank Account Masking obfuscates account number', `Got ${maskedBank}`);

  // 6. Audit Logging Verification
  const auditRecord = await logAuditEvent({
    action: 'security_test_run',
    entity_type: 'security',
    entity_id: 'test-001',
    actor_id: adminUser.id,
    actor_email: adminUser.email,
    actor_role: adminUser.role,
    details: { passed: true },
  });

  assert(auditRecord.action === 'security_test_run', 'Audit Log event recorded successfully');

  const logs = await getAuditLogs(10);
  assert(logs.length > 0, 'Audit Log history retrievable for security review');

  return { passed, failed, results };
}
