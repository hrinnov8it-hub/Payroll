import assert from 'node:assert/strict';
import test from 'node:test';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { getSafeReturnUrl } from '../redirect';

const authUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'employee@example.com', aud: 'authenticated', role: 'authenticated',
  app_metadata: {}, user_metadata: {}, created_at: '2026-01-01T00:00:00Z',
};

function session(expiresAt = Math.floor(Date.now() / 1000) + 3600) {
  const token = [
    { alg: 'HS256', typ: 'JWT' },
    { sub: authUser.id, exp: expiresAt, role: 'authenticated' },
  ].map(value => Buffer.from(JSON.stringify(value)).toString('base64url')).join('.') + '.test-signature';
  return { access_token: token, refresh_token: 'test-refresh-token', expires_at: expiresAt,
    expires_in: 3600, token_type: 'bearer', user: authUser };
}

function cookie(value = session()) {
  return 'sb-auth-test-auth-token=base64-' + Buffer.from(JSON.stringify(value)).toString('base64url');
}

test('login return URLs stay inside the application', () => {
  assert.equal(getSafeReturnUrl('/employees/123/edit?tab=pay'), '/employees/123/edit?tab=pay');
  for (const value of [null, '', 'https://evil.test', '//evil.test', '/\\evil.test', '/login', '/api/migrate', '/employees/../../login', '/dashboard\nLocation:evil']) {
    assert.equal(getSafeReturnUrl(value), '/dashboard', String(value));
  }
});

test('Supabase route protection validates sessions and preserves refresh cookies', async t => {
  const originalFetch = globalThis.fetch;
  const originalEnv = { url: process.env.NEXT_PUBLIC_SUPABASE_URL, anon: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    publishable: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://auth-test.supabase.co';
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_test';
  const request = (path: string, cookies?: string) => new NextRequest(`https://payroll.test${path}`, {
    headers: cookies ? { cookie: cookies } : undefined,
  });
  try {
    globalThis.fetch = async () => { throw new Error('Unexpected Auth call without a session'); };

    await t.test('anonymous pages redirect and retain the requested query', async () => {
      for (const path of ['/dashboard', '/employees/123/edit', '/attendance', '/payroll-runs/123', '/payslips/123', '/reports', '/settings', '/future-private-page']) {
        const response = await updateSession(request(path + '?tab=pay'));
        assert.equal(response.status, 303, path);
        const location = new URL(response.headers.get('location')!);
        assert.equal(location.pathname, '/login');
        if (path !== '/future-private-page') assert.equal(location.searchParams.get('returnUrl'), path + '?tab=pay');
        assert.equal(response.headers.get('cache-control'), 'private, no-store');
      }
    });
    await t.test('a forged legacy admin cookie never authenticates a page or API', async () => {
      assert.equal((await updateSession(request('/employees', 'innov8it_auth_user=admin'))).status, 303);
      const response = await updateSession(request('/api/migrate', 'innov8it_auth_user=admin'));
      assert.equal(response.status, 401);
      assert.equal((await response.json()).success, false);
    });
    await t.test('login stays publicly reachable', async () => {
      assert.equal((await updateSession(request('/login'))).status, 200);
    });

    let userRequests = 0;
    globalThis.fetch = async input => {
      assert.equal(new URL(String(input)).pathname, '/auth/v1/user');
      userRequests++;
      return Response.json(authUser);
    };
    await t.test('a session is checked against Auth before private access', async () => {
      const response = await updateSession(request('/payslips', cookie()));
      assert.equal(response.status, 200);
      assert.ok(userRequests > 0);
    });
    await t.test('authenticated login redirects cannot escape the application', async () => {
      const response = await updateSession(request('/login?returnUrl=//evil.test', cookie()));
      assert.equal(response.headers.get('location'), 'https://payroll.test/dashboard');
    });

    globalThis.fetch = async () => Response.json({ code: 'bad_jwt', msg: 'Invalid token' }, { status: 401 });
    await t.test('a rejected Auth token cannot grant access', async () => {
      assert.equal((await updateSession(request('/settings', cookie()))).status, 303);
    });

    let refreshed = false;
    globalThis.fetch = async input => {
      const path = new URL(String(input)).pathname;
      if (path === '/auth/v1/token') { refreshed = true; return Response.json(session()); }
      assert.equal(path, '/auth/v1/user');
      return Response.json(authUser);
    };
    await t.test('refreshed cookies survive the redirect from login', async () => {
      const response = await updateSession(request('/login?returnUrl=/payslips', cookie(session(Math.floor(Date.now() / 1000) - 60))));
      assert.equal(refreshed, true);
      assert.equal(response.headers.get('location'), 'https://payroll.test/payslips');
      assert.ok(response.cookies.getAll().some(item => item.name.startsWith('sb-auth-test-auth-token') && item.value));
      assert.equal(response.headers.get('cache-control'), 'private, no-store');
    });

    await t.test('missing configuration fails closed', async () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      assert.equal((await updateSession(request('/dashboard', 'innov8it_auth_user=admin'))).status, 503);
    });
  } finally {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries({ NEXT_PUBLIC_SUPABASE_URL: originalEnv.url,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: originalEnv.anon, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: originalEnv.publishable })) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
