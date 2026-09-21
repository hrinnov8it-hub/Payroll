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
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Syncing...');
    try {
      const res = await fetch('/api/sync', { method: 'POST' });
      const result = await res.json();
      if (result.success) {
        setSyncStatus(`Synced! (${result.synced?.departments || 0} depts, ${result.synced?.employees || 0} emp)`);
        setTimeout(() => setSyncStatus(null), 5000);
      } else {
        const msg = result.errors?.[0] || 'Sync incomplete';
        setSyncStatus(msg.length > 35 ? msg.substring(0, 35) + '...' : msg);
        setTimeout(() => setSyncStatus(null), 6000);
      }
    } catch {
      setSyncStatus('Sync network failed');
      setTimeout(() => setSyncStatus(null), 4000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSignOut = async () => {
    setIsLoggingOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push('/login');
      router.refresh();
    } catch {
      window.location.href = '/login';
    } finally {
      setIsLoggingOut(false);
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

      <div className="topbar-right" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <Button
          variant="outline"
          size="xs"
          onClick={handleSync}
          isLoading={isSyncing}
          title="Sync departments, positions, employees, and settings to Supabase"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          {syncStatus || 'Sync to Supabase'}
        </Button>

        {userEmail ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Badge variant="brand" dot>
              {userEmail}
            </Badge>
            <Button
              variant="outline"
              size="xs"
              onClick={handleSignOut}
              isLoading={isLoggingOut}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <Badge variant="brand" dot>
            Payroll System Active
          </Badge>
        )}
      </div>
    </header>
  );
};
