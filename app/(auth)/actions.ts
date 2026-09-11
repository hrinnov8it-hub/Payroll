'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser, UserRole } from '@/types/auth';

export interface LoginActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action for user login with email and password
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const returnUrl = (formData.get('returnUrl') as string) || '/dashboard';

  if (!email || !password) {
    return {
      success: false,
      error: 'Please provide both your work email and password.',
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || 'Authentication failed. Please verify your credentials.',
    };
  }

  if (!data.session) {
    return {
      success: false,
      error: 'Please verify your email address before signing in.',
    };
  }

  redirect(returnUrl);
}

/**
 * Server Action for signing out
 */
export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}

/**
 * Server Action to fetch current authenticated user and their profile role
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return null;

    // Fetch profile role
    const { data: profile } = (await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single()) as { data: { role?: string; full_name?: string | null } | null };

    return {
      id: user.id,
      email: user.email || '',
      role: (profile?.role as UserRole) || 'employee',
      fullName: profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0],
    };
  } catch {
    return null;
  }
}
