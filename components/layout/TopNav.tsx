'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { usePortalUser } from '@/lib/auth/use-portal-user';
import { signOut } from '@/lib/auth/sign-out';
import { getAccountRoleLabel } from '@/lib/auth/account-role';

interface TopNavProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  title = 'Dashboard',
}) => {
  const user = usePortalUser();
  const userEmail = user?.email || 'Loading account...';
  const userRole = user ? getAccountRoleLabel(user.role) : 'Verifying session...';
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Automatically synchronize data to Supabase in background once per session
  useEffect(() => {
    if (user && user.role !== 'employee') {
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
  }, [user?.id, user?.role]);

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try { await signOut(); } catch {
      setIsLoggingOut(false);
      alert('Unable to sign out. Please try again.');
    }
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
          {userEmail}
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
