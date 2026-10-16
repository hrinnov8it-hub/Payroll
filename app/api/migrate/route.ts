import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/app/(auth)/actions';

/**
 * POST /api/migrate
 * Runs the payroll_settings schema migration to add statutory columns.
 * Requires SUPABASE_SERVICE_ROLE_KEY in environment variables.
 * This endpoint should only be called once, from the Super Admin settings page.
 */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 });
  if (user.role !== 'super_admin') return NextResponse.json({ success: false, error: 'Super Admin access required.' }, { status: 403 });

  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!serviceKey) {
    return NextResponse.json(
      { success: false, error: 'SUPABASE_SERVICE_ROLE_KEY is not set in environment variables. Please add it to your .env.local file.' },
      { status: 400 }
    );
  }

  if (!supabaseUrl) {
    return NextResponse.json(
      { success: false, error: 'NEXT_PUBLIC_SUPABASE_URL is not configured.' },
      { status: 400 }
    );
  }

  const sql = `
    ALTER TABLE payroll_settings
      ADD COLUMN IF NOT EXISTS tin_number text DEFAULT '',
      ADD COLUMN IF NOT EXISTS sss_employer_id text DEFAULT '',
      ADD COLUMN IF NOT EXISTS philhealth_employer_id text DEFAULT '',
      ADD COLUMN IF NOT EXISTS pagibig_employer_id text DEFAULT '',
      ADD COLUMN IF NOT EXISTS rdo_code text DEFAULT '',
      ADD COLUMN IF NOT EXISTS signatory_name text DEFAULT '',
      ADD COLUMN IF NOT EXISTS signatory_title text DEFAULT '',
      ADD COLUMN IF NOT EXISTS enable_signatory_on_payslips boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS require_dual_approval boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS lock_closed_periods boolean DEFAULT true,
      ADD COLUMN IF NOT EXISTS maintenance_mode boolean DEFAULT false;
  `;

  try {
    // Use the pg-meta API (available with service role key)
    const response = await fetch(`${supabaseUrl}/pg-meta/v1/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return NextResponse.json(
        { success: false, error: `Migration failed: ${errText}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, message: 'Migration completed successfully. All statutory columns are now saved to the database.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unexpected error running migration' },
      { status: 500 }
    );
  }
}
