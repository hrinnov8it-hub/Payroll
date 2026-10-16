import Link from 'next/link';
import type { CSSProperties, ReactNode } from 'react';

export type WorkspaceIconName = 'people' | 'calendar' | 'wallet' | 'clock' | 'document' | 'check' | 'settings' | 'shield' | 'chart' | 'download' | 'print' | 'eye' | 'trash' | 'lock' | 'unlock' | 'undo';

export function WorkspaceIcon({ name, size = 20 }: { name: WorkspaceIconName; size?: number }) {
  const paths: Record<WorkspaceIconName, ReactNode> = {
    people: <><circle cx="9" cy="7" r="4" /><path d="M2 21v-2a4 4 0 0 1 4-4h6a4 4 0 0 1 4 4v2M16 3a4 4 0 0 1 0 8M22 21v-2a4 4 0 0 0-3-4" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 11h18M8 15h2M14 15h2" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 8V6a3 3 0 0 1 3-3h11M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="16" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6Z" /><path d="m8 12 3 3 5-6" /></>,
    chart: <><path d="M4 3v17h17M8 15v-4M13 15V6M18 15v-7" /></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5M4 16v4h16v-4" /></>,
    print: <><path d="M7 8V3h10v5M7 17H4V9h16v8h-3" /><path d="M7 14h10v7H7Z" /></>,
    eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
    trash: <><path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    unlock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0M12 14v3" /></>,
    undo: <><path d="m7 4-5 5 5 5M2 9h12a7 7 0 0 1 0 14" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
  hideOnPrint?: boolean;
}

export function PageHeader({ eyebrow, title, description, actions, back, hideOnPrint }: PageHeaderProps) {
  return <header className={`workspace-header${hideOnPrint ? ' reports-no-print' : ''}`}>
    <div className="workspace-heading">
      {back && <Link className="workspace-back" href={back.href}><span aria-hidden="true">←</span>{back.label}</Link>}
      <div className="workspace-eyebrow">{eyebrow}</div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
    {actions && <div className="workspace-header-actions">{actions}</div>}
  </header>;
}

export function WorkspaceStats({ children, columns = 4, label = 'Summary' }: { children: ReactNode; columns?: 3 | 4 | 5; label?: string }) {
  return <section className={`workspace-stats workspace-stats--${columns}`} style={{ '--workspace-columns': columns } as CSSProperties} aria-label={label}>{children}</section>;
}

export function WorkspaceStat({ label, value, hint, icon, tone = 'teal', loading = false }: {
  label: string; value: ReactNode; hint: ReactNode; icon: WorkspaceIconName;
  tone?: 'teal' | 'blue' | 'amber' | 'green'; loading?: boolean;
}) {
  return <article className="workspace-stat" aria-busy={loading}>
    <div className="workspace-stat-top"><span>{label}</span><span className={`workspace-stat-icon workspace-tone-${tone}`}><WorkspaceIcon name={icon} size={19} /></span></div>
    <div className="workspace-stat-value">{loading ? <span className="workspace-skeleton" aria-label="Loading" /> : value}</div>
    <p>{loading ? 'Loading summary…' : hint}</p>
  </article>;
}

export function PanelHeading({ title, description, detail }: { title: string; description?: string; detail?: ReactNode }) {
  return <div className="workspace-panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{detail && <span className="workspace-panel-detail">{detail}</span>}</div>;
}
