import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';

/**
 * Handles session token refreshing and route protection via Next.js middleware
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Authenticate user securely
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const localAdminCookie = request.cookies.get('innov8it_auth_user')?.value;
  const isAuthenticated = !!user || !!localAdminCookie;

  const pathname = request.nextUrl.pathname;
  const isAuthPage = pathname === '/login' || pathname.startsWith('/(auth)');
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/employees') ||
    pathname.startsWith('/attendance') ||
    pathname.startsWith('/payroll') ||
    pathname.startsWith('/payslips') ||
    pathname.startsWith('/reports') ||
    pathname.startsWith('/settings');

  // If user is not logged in and attempts to access protected routes, redirect to login
  if (!isAuthenticated && isProtectedPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('returnUrl', pathname);
    return NextResponse.redirect(url);
  }

  // If user is already authenticated and visits the login page, redirect to dashboard
  if (isAuthenticated && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
