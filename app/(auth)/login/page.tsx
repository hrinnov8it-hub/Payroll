'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/ui/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Phase 2 placeholder: Supabase Auth will be activated in Phase 3
    window.location.href = '/dashboard';
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <Logo size="lg" className="mb-4" />
          <h1 className="auth-title" style={{ marginTop: '1rem' }}>Employee & HR Portal</h1>
          <p className="auth-subtitle">Sign in with your Innov8IT organizational account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <Input
            label="Work Email Address"
            type="email"
            id="login-email"
            placeholder="username@innov8it.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            <a href="#" style={{ fontSize: '0.82rem', color: 'var(--brand-blue)', fontWeight: 600 }}>
              Forgot password?
            </a>
          </div>

          <Button type="submit" variant="primary" fullWidth size="lg">
            Sign In to Dashboard
          </Button>
        </form>

        <div className="auth-notice">
          <strong>Design System Active:</strong> Input fields, iconography, buttons, and visual identity match approved Innov8IT branding. Real session authentication will activate in Phase 3.
        </div>

        <div className="auth-footer">
          <Link href="/dashboard" style={{ color: 'var(--brand-blue)', fontWeight: 600 }}>
            Go straight to Dashboard →
          </Link>
          <div style={{ marginTop: '0.75rem', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
            © {new Date().getFullYear()} Innov8IT Inc. Secure Enterprise Payroll.
          </div>
        </div>
      </div>
    </div>
  );
}
