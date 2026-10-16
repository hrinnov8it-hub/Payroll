import { cache } from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/app/(auth)/actions';

// Request-scoped cache only; never share a user's session between requests.
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
});

export async function requireAdminOrHR() {
  const user = await requireUser();
  if (!['super_admin', 'admin', 'payroll_hr'].includes(user.role)) redirect('/payslips');
  return user;
}
