import { NextResponse } from 'next/server';
import { syncAllDataToSupabase } from '@/lib/supabase/sync-all';

export async function POST() {
  try {
    const result = await syncAllDataToSupabase();
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || 'Sync failed' },
      { status: 500 }
    );
  }
}
