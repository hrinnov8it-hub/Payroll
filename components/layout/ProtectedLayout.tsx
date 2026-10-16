import { requireUser, requireAdminOrHR } from '@/lib/auth/route-guard';

export async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  await requireUser();
  return children;
}

export async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminOrHR();
  return children;
}
