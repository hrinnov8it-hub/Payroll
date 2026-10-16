'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import type { AuthUser } from '@/types/auth';
import { getSafeReturnUrl } from '@/lib/auth/redirect';

export interface LoginActionResult {
  success: boolean;
  error?: string;
}

/**
 * Server Action for user login with email and password
 */
export async function loginAction(formData: FormData): Promise<LoginActionResult> {
  const emailValue = formData.get('email');
  const password = formData.get('password');
  const email = typeof emailValue === 'string' ? emailValue.trim().toLowerCase() : '';
  const returnUrl = getSafeReturnUrl(formData.get('returnUrl'));

  if (!email || typeof password !== 'string' || !password) {
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
      error: 'Unable to sign in. Check your email and password and try again.',
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
  const { error } = await supabase.auth.signOut();
  if (error) throw new Error('Unable to sign out. Please try again.');
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
      role: profile?.role === 'super_admin' || profile?.role === 'admin' || profile?.role === 'payroll_hr' ? profile.role : 'employee',
      fullName: profile?.full_name || (user.user_metadata?.full_name as string) || user.email?.split('@')[0],
    };
  } catch {
    return null;
  }
}
