'use client';

import React from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';

interface TopNavProps {
  onToggleSidebar: () => void;
  title?: string;
}

export const TopNav: React.FC<TopNavProps> = ({
  onToggleSidebar,
  title = 'Dashboard',
}) => {
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

      <div className="topbar-right">
        <Badge variant="brand" dot>
          Phase 2 • Design System Finalized
        </Badge>

        <div className="topbar-actions">
          <Link href="/(auth)/login" className="icon-btn" title="View Login Screen">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" x2="3" y1="12" y2="12" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
};
