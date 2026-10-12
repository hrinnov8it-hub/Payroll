import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';

/**
 * Creates a Supabase client for use in browser / client components
 */
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://trtwxovcqccwkzuvfzez.supabase.co';
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_-8NXa3TEJqfut8lSBYd0-A_sAtiliv8';

  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
