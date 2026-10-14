import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types/auth';

export const HR_SUPER_ADMIN_EMAIL = 'hr.innov8it@gmail.com';
export const RETIRED_OWNER_EMAIL = 'superadmin.innov8it@gmail.com';

export function isHRSuperAdmin(email?: string | null): boolean {
  return email?.trim().toLowerCase() === HR_SUPER_ADMIN_EMAIL;
}

export function resolveAccountRole(email?: string | null, role?: string | null): UserRole {
  if (isHRSuperAdmin(email)) return 'super_admin';
  if (role === 'super_admin' || role === 'admin' || role === 'payroll_hr') return role;
  return 'employee';
}

export function getAccountRoleLabel(role: UserRole): string {
  return { super_admin: 'Super Admin', admin: 'Admin', payroll_hr: 'Payroll Officer', employee: 'Employee' }[role];
}

export async function getAccountRole(id: string, email?: string | null): Promise<UserRole> {
  try {
    const { data } = await createClient().from('profiles').select('role').eq('id', id).maybeSingle();
    return resolveAccountRole(email, (data as { role: string } | null)?.role);
  } catch {
    return resolveAccountRole(email);
  }
}
