'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';
import { AlertBanner } from '@/components/ui/ErrorState';
import { createClient } from '@/lib/supabase/client';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get('returnUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMessage(error.message);
        setIsLoading(false);
        return;
      }

      if (data.session) {
        router.push(returnUrl);
        router.refresh();
      } else {
        setErrorMessage('Check your email inbox to confirm your account before signing in.');
        setIsLoading(false);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred during authentication.');
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-header">
        <Logo size="lg" className="mb-4" />
        <h1 className="auth-title" style={{ marginTop: '1rem' }}>Employee & HR Portal</h1>
        <p className="auth-subtitle">Sign in to your Innov8IT Payroll account</p>
      </div>

      {errorMessage && (
        <div style={{ marginBottom: '1.25rem' }}>
          <AlertBanner
            variant="danger"
            title="Authentication Error"
            message={errorMessage}
            onClose={() => setErrorMessage(null)}
          />
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <Input
          label="Work Email Address"
          type="email"
          id="login-email"
          placeholder="admin@innov8it.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          }
        />

        <Input
          label="Password"
          type="password"
          id="login-password"
          placeholder="••••••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          disabled={isLoading}
          leftIcon={
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          }
        />

        <div style={{ margin: '0.5rem 0 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <input type="checkbox" style={{ accentColor: 'var(--brand-blue)' }} />
            Remember me
          </label>
          <a href="#" onClick={(e) => { e.preventDefault(); alert('Please contact your Innov8IT HR administrator to reset your credentials.'); }} style={{ fontSize: '0.82rem', color: 'var(--brand-blue)', fontWeight: 600 }}>
            Forgot password?
          </a>
        </div>

        <Button type="submit" variant="primary" fullWidth size="lg" isLoading={isLoading} disabled={isLoading}>
          {isLoading ? 'Authenticating...' : 'Sign In to Dashboard'}
        </Button>
      </form>

      <div className="auth-notice" style={{ marginTop: '1.25rem', fontSize: '0.8rem' }}>
        <strong>Supabase Auth Active:</strong> Protected by industry-standard encryption and verified against your live Supabase project.
      </div>

      <div className="auth-footer">
        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
          © {new Date().getFullYear()} Innov8IT Inc. All rights reserved.
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="auth-container">
      <Suspense fallback={<div className="auth-card">Loading authentication portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
