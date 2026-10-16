import { NextResponse } from 'next/server';
import { syncAllDataToSupabase } from '@/lib/supabase/sync-all';
import { getCurrentUser } from '@/app/(auth)/actions';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  if (!['super_admin', 'admin', 'payroll_hr'].includes(user.role)) return NextResponse.json({ success: false, error: 'Admin or HR access required.' }, { status: 403 });
  try {
    const result = await syncAllDataToSupabase(await createClient());
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
