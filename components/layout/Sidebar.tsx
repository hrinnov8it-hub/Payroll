'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/ui/Logo';
import { createClient } from '@/lib/supabase/client';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const pathname = usePathname();
  const [userEmail, setUserEmail] = useState<string>('hr.innov8it@gmail.com');
  const [userInitials, setUserInitials] = useState<string>('HR');
  const [userRole, setUserRole] = useState<string>('HR Admin');

  useEffect(() => {
    // 1. Check local session
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('innov8it_current_user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.email) {
            setUserEmail(parsed.email);
            const namePart = parsed.email.split('@')[0];
            setUserInitials(namePart.slice(0, 2).toUpperCase());
            if (parsed.role === 'super_admin' || parsed.email.toLowerCase().includes('superadmin')) {
              setUserRole('Super Admin');
            } else {
              setUserRole('HR Admin');
            }
          }
        }
      } catch {}
    }

    // 2. Check Supabase session
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.email) {
        setUserEmail(user.email);
        const namePart = user.email.split('@')[0];
        setUserInitials(namePart.slice(0, 2).toUpperCase());
        if (user.email.toLowerCase().includes('superadmin')) {
          setUserRole('Super Admin');
        } else {
          setUserRole('HR Admin');
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user?.email) {
        setUserEmail(session.user.email);
        const namePart = session.user.email.split('@')[0];
        setUserInitials(namePart.slice(0, 2).toUpperCase());
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

  const handleSignOut = async () => {
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

  const navItems = [
    {
      title: 'Main',
      items: [
        {
          name: 'Dashboard',
          href: '/dashboard',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="7" height="9" x="3" y="3" rx="1" />
              <rect width="7" height="5" x="14" y="3" rx="1" />
              <rect width="7" height="9" x="14" y="12" rx="1" />
              <rect width="7" height="5" x="3" y="16" rx="1" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Payroll Modules',
      items: [
        {
          name: 'Employees',
          href: '/employees',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          ),
        },

        {
          name: 'Payroll Runs',
          href: '/payroll-runs',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="2" x2="12" y2="22" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          ),
        },
        {
          name: 'Payslips',
          href: '/payslips',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" x2="8" y1="13" y2="13" />
              <line x1="16" x2="8" y1="17" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          ),
        },
        {
          name: 'Reports & Compliance',
          href: '/reports',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" x2="18" y1="20" y2="10" />
              <line x1="12" x2="12" y1="20" y2="4" />
              <line x1="6" x2="6" y1="20" y2="14" />
            </svg>
          ),
        },
      ],
    },
    {
      title: 'Configuration',
      items: [
        {
          name: 'Payroll Settings',
          href: '/settings',
          badge: null,
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          ),
        },
        {
          name: 'Super Admin Settings',
          href: '/settings?tab=superadmin',
          badge: 'Root',
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <>
      <div
        className={`sidebar-backdrop ${isOpen ? 'open' : ''}`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <Logo size="sm" theme="dark" />
        </div>

        <nav className="sidebar-nav">
          {navItems.map((section, idx) => (
            <div key={idx}>
              <div className="nav-section-title">{section.title}</div>
              {section.items.map((item) => {
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (window.innerWidth < 1024) onClose();
                    }}
                  >
                    <span className="nav-item-icon">{item.icon}</span>
                    <span>{item.name}</span>
                    {item.badge && <span className="nav-item-badge">{item.badge}</span>}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-avatar">{userInitials}</div>
          <div className="user-info" style={{ flex: 1, minWidth: 0 }}>
            <span className="user-name" title={userEmail}>{userEmail}</span>
            <span className="user-role">{userRole}</span>
          </div>
          <button
            onClick={handleSignOut}
            title="Sign Out"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: 'var(--radius-sm)',
              color: '#ffffff',
              padding: '7px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </aside>
    </>
  );
};
