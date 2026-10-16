'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { usePathname } from 'next/navigation';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, pageTitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard';

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <TopNav
          title={pageTitle}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="content-container">
          {isDashboard ? children : <div className="workspace-page" data-workspace={pathname.split('/')[1]}>{children}</div>}
        </main>
      </div>
    </div>
  );
};
