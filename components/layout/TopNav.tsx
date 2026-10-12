'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { createClient } from '@/lib/supabase/client';

interface TopNavProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  title = 'Dashboard',
}) => {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string>('HR Admin');
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // 1. Immediately check local session storage for instant badge rendering
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('innov8it_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.email) {
            setUserEmail(parsed.email);
            if (parsed.role === 'super_admin' || parsed.email.toLowerCase().includes('superadmin')) {
              setUserRole('Super Admin');
            } else {
              setUserRole('HR Admin');
            }
          }
        }
      } catch {}
    }

    // 2. Fetch authenticated user from Supabase
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        if (user.email.toLowerCase().includes('superadmin')) {
          setUserRole('Super Admin');
        } else {
          setUserRole('HR Admin');
        }
      } else {
        setUserEmail((prev) => prev || 'hr.innov8it@gmail.com');
      }
    }).catch(() => {
      setUserEmail((prev) => prev || 'hr.innov8it@gmail.com');
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        if (session.user.email.toLowerCase().includes('superadmin')) {
          setUserRole('Super Admin');
        } else {
          setUserRole('HR Admin');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Automatically synchronize data to Supabase in background once per session
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const alreadySynced = sessionStorage.getItem('innov8it_auto_synced');
      if (!alreadySynced) {
        fetch('/api/sync', { method: 'POST' })
          .then((res) => res.json())
          .then((data) => {
            if (data?.success) {
              sessionStorage.setItem('innov8it_auto_synced', 'true');
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {}

    if (typeof document !== 'undefined') {
      document.cookie = 'innov8it_auth_user=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      try {
        localStorage.removeItem('innov8it_current_user');
        sessionStorage.clear();
      } catch {}
    }

    window.location.href = '/login';
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle Navigation Menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" x2="21" y1="6" y2="6" />
            <line x1="3" x2="21" y1="12" y2="12" />
            <line x1="3" x2="21" y1="18" y2="18" />
          </svg>
        </button>
        <div className="page-breadcrumb">
          <span>Innov8IT</span>
          <span>/</span>
          <span className="page-title">{title}</span>
        </div>
      </div>

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        <Badge variant="brand" dot>
          {userEmail || 'hr.innov8it@gmail.com'}
        </Badge>
        <span
          style={{
            backgroundColor: userRole === 'Super Admin' ? '#ede9fe' : 'var(--brand-blue-50)',
            color: userRole === 'Super Admin' ? '#6d28d9' : 'var(--brand-dark-blue)',
            border: `1px solid ${userRole === 'Super Admin' ? '#ddd6fe' : 'rgba(3, 70, 151, 0.2)'}`,
            padding: '2px 8px',
            borderRadius: 'var(--radius-xs)',
            fontSize: '0.75rem',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          {userRole === 'Super Admin' && (
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          {userRole}
        </span>
        <Button
          variant="outline"
          size="xs"
          onClick={handleSignOut}
          isLoading={isLoggingOut}
          title="Sign Out of Innov8IT Payroll"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '5px' }}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          Sign Out
        </Button>
      </div>
    </header>
  );
};
