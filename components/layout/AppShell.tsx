'use client';

import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';

interface AppShellProps {
  children: React.ReactNode;
  pageTitle?: string;
}

export const AppShell: React.FC<AppShellProps> = ({ children, pageTitle }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="main-wrapper">
        <TopNav
          title={pageTitle}
          onToggleSidebar={() => setSidebarOpen((prev) => !prev)}
        />
        <main className="content-container">{children}</main>
      </div>
    </div>
  );
};
