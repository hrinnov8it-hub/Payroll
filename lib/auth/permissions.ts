export type UserRole = 'admin' | 'payroll_hr' | 'employee';

export interface UserContext {
  id: string;
  email: string;
  role: UserRole;
  employee_id?: string | null;
  name?: string | null;
}

export interface PermissionCheckResult {
  allowed: boolean;
  statusCode: 200 | 401 | 403;
  error?: string;
}

/**
 * Asserts user is authenticated
 */
export function assertUserAuthenticated(user?: UserContext | null): PermissionCheckResult {
  if (!user || !user.id) {
    return {
      allowed: false,
      statusCode: 401,
      error: '401 Unauthorized: Valid authentication token required.',
    };
  }
  return { allowed: true, statusCode: 200 };
}

/**
 * Asserts user has Admin or HR Manager administrative role
 */
export function assertAdminOrHR(user?: UserContext | null): PermissionCheckResult {
  const authCheck = assertUserAuthenticated(user);
  if (!authCheck.allowed) return authCheck;

  if (user?.role !== 'admin' && user?.role !== 'payroll_hr') {
    return {
      allowed: false,
      statusCode: 403,
      error: '403 Forbidden: Operation restricted to Administrative or HR personnel.',
    };
  }
  return { allowed: true, statusCode: 200 };
}

/**
 * Asserts user is accessing their own record or possesses Admin/HR privileges
 */
export function assertEmployeeSelfOrAdmin(
  user?: UserContext | null,
  targetEmployeeId?: string | null
): PermissionCheckResult {
  const authCheck = assertUserAuthenticated(user);
  if (!authCheck.allowed) return authCheck;

  if (user?.role === 'admin' || user?.role === 'payroll_hr') {
    return { allowed: true, statusCode: 200 };
  }

  if (user?.employee_id && targetEmployeeId && user.employee_id === targetEmployeeId) {
    return { allowed: true, statusCode: 200 };
  }

  return {
    allowed: false,
    statusCode: 403,
    error: '403 Forbidden: Confidential data access restricted under Philippine Data Privacy Act (RA 10173).',
  };
}

/**
 * Sanitizes input strings against script injection (XSS) and malformed control characters
 */
export function sanitizeInputString(input?: string | null): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/[<>]/g, '')
    .trim();
}

/**
 * Validates email format strictly
 */
export function validateEmail(email?: string | null): boolean {
  if (!email) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Masks sensitive PII (TIN, SSS, PhilHealth, Pag-IBIG) for employee privacy
 * Example: "123-456-789-000" -> "****-****-7890"
 */
export function maskPII(
  value?: string | null,
  visibleSuffixCount = 4,
  maskChar = '*'
): string {
  if (!value || value.trim() === '') return '—';
  const clean = value.replace(/[\s-]/g, '');
  if (clean.length <= visibleSuffixCount) return value;

  const maskedPortion = maskChar.repeat(clean.length - visibleSuffixCount);
  const visiblePortion = clean.slice(-visibleSuffixCount);
  return `${maskedPortion}${visiblePortion}`;
}

/**
 * Masks bank account numbers for financial privacy
 * Example: "1234567890" -> "******7890"
 */
export function maskBankAccount(accountNumber?: string | null): string {
  return maskPII(accountNumber, 4, '*');
}
