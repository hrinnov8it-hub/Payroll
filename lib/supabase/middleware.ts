import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@/types/database';
import { getSupabaseConfig } from './config';
import { getSafeReturnUrl } from '@/lib/auth/redirect';

/**
 * Handles session token refreshing and route protection via Next.js middleware
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const finish = (response: NextResponse) => {
    for (const cookie of supabaseResponse.cookies.getAll()) response.cookies.set(cookie);
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  };
  let config: ReturnType<typeof getSupabaseConfig>;
  try {
    config = getSupabaseConfig();
  } catch {
    return finish(NextResponse.json({ error: 'Authentication is not configured.' }, { status: 503 }));
  }

  const supabase = createServerClient<Database>(
    config.url,
    config.key,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
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

  // Only Auth-validated sessions grant access; custom cookies are never trusted.
  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (!error) user = data.user;
  } catch {
    // Deny private access if Auth is unavailable.
  }

  const pathname = request.nextUrl.pathname;
  if (!user && pathname !== '/login') {
    if (pathname.startsWith('/api/')) {
      return finish(NextResponse.json({ success: false, error: 'Authentication required.' }, { status: 401 }));
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    url.searchParams.set('returnUrl', getSafeReturnUrl(pathname + request.nextUrl.search));
    return finish(NextResponse.redirect(url, 303));
  }

  // If user is already authenticated and visits the login page, redirect to dashboard
  if (user && pathname === '/login') {
    const url = new URL(getSafeReturnUrl(request.nextUrl.searchParams.get('returnUrl')), request.url);
    return finish(NextResponse.redirect(url, 303));
  }

  return finish(supabaseResponse);
}
