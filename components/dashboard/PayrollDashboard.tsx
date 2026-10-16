'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Button, ButtonLink } from '@/components/ui/Button';
import type { PayrollRun, PayrollRunStatus } from '@/types/payroll';
import type { PayrollPeriod } from '@/types/attendance';
import type { Employee } from '@/types/employee';
import styles from './PayrollDashboard.module.css';

type IconName = 'people' | 'wallet' | 'clock' | 'check' | 'calendar' | 'arrow' | 'plus' | 'search' | 'document' | 'settings' | 'refresh';

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    people: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87" /><circle cx="9" cy="7" r="4" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>,
    wallet: <><rect x="3" y="5" width="18" height="15" rx="3" /><path d="M3 8V6a3 3 0 0 1 3-3h11M16 11h5v5h-5a2.5 2.5 0 0 1 0-5Z" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    check: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M16 3v4M8 3v4M3 11h18M8 15h2M14 15h2" /></>,
    arrow: <><path d="M5 12h14m-5-5 5 5-5 5" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    document: <><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9Z" /><path d="M14 3v6h6M8 13h8M8 17h5" /></>,
    settings: <><path d="M4 6h16M4 12h16M4 18h16" /><circle cx="8" cy="6" r="2" fill="currentColor" /><circle cx="16" cy="12" r="2" fill="currentColor" /><circle cx="10" cy="18" r="2" fill="currentColor" /></>,
    refresh: <><path d="M20 7v5h-5M4 17v-5h5" /><path d="M6 7a7 7 0 0 1 12-1l2 3M4 15l2 3a7 7 0 0 0 12-1" /></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}

const money = (value: number) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
const formatDate = (value?: string) => {
  if (!value) return 'Not scheduled';
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? 'Not scheduled' : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const statuses: Record<PayrollRunStatus, { label: string; variant: 'warning' | 'info' | 'brand' | 'success' | 'neutral' }> = {
  draft: { label: 'Draft', variant: 'neutral' },
  processing: { label: 'Processing', variant: 'info' },
  review: { label: 'In review', variant: 'warning' },
  approved: { label: 'Approved', variant: 'brand' },
  paid: { label: 'Paid', variant: 'success' },
  locked: { label: 'Locked', variant: 'neutral' },
};

function RunStatus({ status }: { status: PayrollRunStatus }) {
  const item = statuses[status] || { label: status, variant: 'neutral' as const };
  return <Badge variant={item.variant} dot>{item.label}</Badge>;
}

interface PayrollDashboardProps {
  runs: PayrollRun[];
  periods: PayrollPeriod[];
  employees: Employee[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onNewPayroll: () => void;
}

export function PayrollDashboard({ runs, periods, employees, loading, error, onRefresh, onNewPayroll }: PayrollDashboardProps) {
  const [filter, setFilter] = useState<'all' | 'review' | 'progress' | 'completed'>('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const latest = runs[0];
  const activePeriod = periods.find(period => period.status === 'open') || periods[0];
  const cycleRun = activePeriod ? runs.find(run => run.payroll_period_id === activePeriod.id) : undefined;
  const activeEmployees = employees.filter(employee => employee.status === 'active').length;
  const inReview = runs.filter(run => run.status === 'review').length;
  const inProgress = runs.filter(run => run.status === 'draft' || run.status === 'processing').length;
  const completed = runs.filter(run => run.status === 'paid' || run.status === 'locked').length;
  const filteredRuns = useMemo(() => runs.filter(run => {
    const matchesStatus = filter === 'all' || (filter === 'review' ? run.status === 'review' : filter === 'progress' ? ['draft', 'processing'].includes(run.status) : ['paid', 'locked'].includes(run.status));
    const query = search.trim().toLowerCase();
    return matchesStatus && (!query || `${run.run_number} ${run.payroll_period?.name || ''}`.toLowerCase().includes(query));
  }), [runs, filter, search]);
  const pageCount = Math.max(1, Math.ceil(filteredRuns.length / 5));
  const currentPage = Math.min(page, pageCount);
  const visibleRuns = filteredRuns.slice((currentPage - 1) * 5, currentPage * 5);
  const gross = Number(latest?.total_gross_pay || 0);
  const deductions = Number(latest?.total_deductions || 0);
  const net = Number(latest?.total_net_pay || 0);
  const netShare = gross > 0 ? Math.max(0, Math.min(100, net / gross * 100)) : 0;

  const metrics: { label: string; value: string | number; detail: string; icon: IconName; tone: string }[] = [
    { label: 'Active employees', value: activeEmployees, detail: `${employees.length} people on your roster`, icon: 'people', tone: 'teal' },
    { label: 'Latest net payroll', value: money(net), detail: latest?.run_number || 'No payroll calculated yet', icon: 'wallet', tone: 'blue' },
    { label: 'Awaiting review', value: inReview, detail: inReview === 1 ? '1 payroll run needs approval' : `${inReview} payroll runs need approval`, icon: 'clock', tone: 'amber' },
    { label: 'Completed runs', value: completed, detail: 'Paid or locked payroll runs', icon: 'check', tone: 'green' },
  ];

  return (
    <div className={styles.dashboard} aria-busy={loading}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}>YOUR WORKSPACE, AT A GLANCE</div><h1>Payroll overview</h1><p>Keep your people, pay cycles, and payouts in view.</p></div>
        <div className={styles.headerActions}>
          <ButtonLink href="/reports" variant="outline"><Icon name="document" size={17} />View reports</ButtonLink>
          <Button onClick={onNewPayroll} disabled={loading || periods.length === 0} leftIcon={<Icon name="plus" size={18} />}>New payroll run</Button>
        </div>
      </header>

      {error && <div role="alert" className={styles.error}><span>{error}</span><Button variant="danger-outline" size="xs" onClick={onRefresh}>Try again</Button></div>}

      <section className={styles.metrics} aria-label="Payroll summary">
        {metrics.map(metric => <article className={styles.metric} key={metric.label}>
          <div className={styles.metricTop}><span>{metric.label}</span><span className={`${styles.iconBox} ${styles[metric.tone]}`}><Icon name={metric.icon} size={19} /></span></div>
          <div className={`${styles.metricValue} ${loading ? styles.skeletonValue : ''}`}>{loading ? <span className={styles.skeleton} /> : metric.value}</div>
          <p>{loading ? 'Loading summary…' : metric.detail}</p>
        </article>)}
      </section>

      <div className={styles.cycleGrid}>
        <section className={styles.cycle} aria-labelledby="pay-cycle-heading">
          <div className={styles.cycleTop}><span className={styles.cycleLabel}><Icon name="calendar" size={17} />PAY CYCLE</span><span className={styles.cyclePill}>{loading ? 'Loading…' : activePeriod ? (activePeriod.status === 'open' ? 'Open period' : activePeriod.status === 'processing' ? 'Processing period' : 'Closed period') : 'No period set'}</span></div>
          <h2 id="pay-cycle-heading">{loading ? 'Loading pay cycle…' : activePeriod?.name || 'Your next payroll starts here'}</h2>
          <p className={styles.cycleDescription}>{activePeriod ? `${formatDate(activePeriod.start_date)} – ${formatDate(activePeriod.end_date)}` : 'Set up a payroll period to get your team’s next payout underway.'}</p>
          <div className={styles.cycleDetails}>
            <div><span>Payout date</span><strong>{loading ? '—' : formatDate(activePeriod?.payout_date)}</strong></div>
            <div><span>Net payroll this cycle</span><strong>{loading ? '—' : cycleRun ? money(Number(cycleRun.total_net_pay || 0)) : 'Not calculated'}</strong></div>
            <div><span>Run status</span><strong>{loading ? '—' : cycleRun ? statuses[cycleRun.status]?.label || cycleRun.status : 'Not started'}</strong></div>
          </div>
          <div className={styles.cycleBottom}><span>{cycleRun ? `${cycleRun.total_employees} employees included in ${cycleRun.run_number}` : `${activeEmployees} active employees on your roster`}</span><Link href={cycleRun ? `/payroll-runs/${cycleRun.id}` : '/attendance'}>{cycleRun ? 'Open payroll run' : 'Manage pay periods'}<Icon name="arrow" size={16} /></Link></div>
        </section>

        <section className={styles.shortcuts} aria-labelledby="quick-actions-heading">
          <div className={styles.sectionHeading}><h2 id="quick-actions-heading">Quick actions</h2><span>Keep things moving</span></div>
          {([
            { href: '/employees', icon: 'people' as const, title: 'Employee directory', text: 'Manage your people and pay details' },
            { href: '/attendance', icon: 'calendar' as const, title: 'Review attendance', text: 'Check time records for the next run' },
            { href: '/payslips', icon: 'document' as const, title: 'Employee payslips', text: 'Review and print payroll documents' },
          ]).map(action => <Link href={action.href} className={styles.shortcut} key={action.href}><span className={styles.shortcutIcon}><Icon name={action.icon} /></span><span><strong>{action.title}</strong><small>{action.text}</small></span><Icon name="arrow" size={17} /></Link>)}
        </section>
      </div>

      <div className={styles.bottomGrid}>
        <section className={styles.runs} aria-labelledby="payroll-runs-heading">
          <div className={styles.runsHeader}><div><h2 id="payroll-runs-heading">Payroll runs <span className={styles.count}>{loading ? '—' : runs.length}</span></h2><p>Your recent calculations and their current status.</p></div><Button variant="outline" size="xs" iconOnly onClick={onRefresh} disabled={loading} aria-label="Refresh payroll data"><Icon name="refresh" size={17} /></Button></div>
          <div className={styles.tableTools}>
            <div className={styles.filters} role="group" aria-label="Filter payroll runs">
              {([{ key: 'all', label: 'All runs', count: runs.length }, { key: 'review', label: 'In review', count: inReview }, { key: 'progress', label: 'In progress', count: inProgress }, { key: 'completed', label: 'Completed', count: completed }] as const).map(item => <button key={item.key} aria-pressed={filter === item.key} className={filter === item.key ? styles.activeFilter : ''} onClick={() => { setFilter(item.key); setPage(1); }}>{item.label}<span>{loading ? '—' : item.count}</span></button>)}
            </div>
            <label className={styles.search}><Icon name="search" size={17} /><input type="search" aria-label="Search payroll runs" placeholder="Search runs…" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} /></label>
          </div>
          <div className={styles.tableScroll}>
            <table className={styles.table}><thead><tr><th scope="col">PAYROLL RUN</th><th scope="col">EMPLOYEES</th><th scope="col" className={styles.numeric}>NET PAYROLL</th><th scope="col">STATUS</th><th scope="col"><span className={styles.srOnly}>Open run</span></th></tr></thead>
              <tbody>{loading ? Array.from({ length: 4 }, (_, index) => <tr key={index} aria-hidden="true">{Array.from({ length: 5 }, (_, cell) => <td key={cell}><span className={styles.skeleton} /></td>)}</tr>) : visibleRuns.map(run => <tr key={run.id}>
                <td><Link href={`/payroll-runs/${run.id}`} className={styles.runName}>{run.run_number}</Link><span className={styles.periodName}>{run.payroll_period?.name || 'Payroll period'}</span></td>
                <td><span className={styles.employeeCount}><Icon name="people" size={15} />{run.total_employees}</span></td>
                <td className={`${styles.numeric} ${styles.runAmount}`}>{money(Number(run.total_net_pay || 0))}</td>
                <td><RunStatus status={run.status} /></td>
                <td><ButtonLink href={`/payroll-runs/${run.id}`} variant="outline" size="xs" iconOnly aria-label={`Open ${run.run_number}`}><Icon name="arrow" size={17} /></ButtonLink></td>
              </tr>)}</tbody>
            </table>
          </div>
          {!loading && filteredRuns.length === 0 && <div className={styles.empty}><span className={styles.emptyIcon}><Icon name="document" size={26} /></span><h3>{runs.length ? 'No matching payroll runs' : 'Ready for your first payroll?'}</h3><p>{runs.length ? 'Try another search or choose a different status.' : 'Create a run to calculate salaries and track your team’s payouts.'}</p>{runs.length ? <Button variant="ghost" size="xs" onClick={() => { setSearch(''); setFilter('all'); setPage(1); }}>Clear filters</Button> : <Button size="sm" onClick={onNewPayroll} disabled={periods.length === 0}>Create payroll run</Button>}</div>}
          <div className={styles.tableFooter}><span role="status">{loading ? 'Loading payroll runs…' : filteredRuns.length ? `Showing ${(currentPage - 1) * 5 + 1}–${Math.min(currentPage * 5, filteredRuns.length)} of ${filteredRuns.length} runs` : '0 runs to display'}</span><div className={styles.pagination}><Button variant="outline" size="xs" iconOnly disabled={loading || currentPage === 1} onClick={() => setPage(currentPage - 1)} aria-label="Previous page">‹</Button><span>{currentPage} / {pageCount}</span><Button variant="outline" size="xs" iconOnly disabled={loading || currentPage === pageCount} onClick={() => setPage(currentPage + 1)} aria-label="Next page">›</Button></div></div>
        </section>

        <aside className={styles.aside}>
          <section className={styles.snapshot} aria-labelledby="payroll-snapshot-heading"><div className={styles.sectionHeading}><h2 id="payroll-snapshot-heading">Payroll snapshot</h2><span>Latest run</span></div><div className={styles.snapshotTotal}><span>NET PAYROLL</span><strong>{loading ? '—' : money(net)}</strong><small>{loading ? 'Loading…' : latest?.run_number || 'No payroll run yet'}</small></div>
            <div className={styles.splitBar} data-empty={gross <= 0} role="img" aria-label={latest ? `Net payroll ${money(net)}; deductions ${money(deductions)}` : 'No payroll amounts yet'}><span style={{ width: `${netShare}%` }} /></div>
            <dl className={styles.breakdown}><div><dt><span className={styles.netDot} />Net pay</dt><dd>{loading ? '—' : money(net)}</dd></div><div><dt><span className={styles.deductionDot} />Deductions</dt><dd>{loading ? '—' : money(deductions)}</dd></div><div className={styles.grossTotal}><dt>Total gross pay</dt><dd>{loading ? '—' : money(gross)}</dd></div></dl>
            {latest && <Link href={`/payroll-runs/${latest.id}`} className={styles.snapshotLink}>View full breakdown<Icon name="arrow" size={16} /></Link>}
          </section>
          <Link href="/settings" className={styles.settingsCard}><span className={styles.settingsIcon}><Icon name="settings" size={21} /></span><strong>Keep payroll configured</strong><p>Review contribution rules, deductions, and your company settings.</p><span>Go to settings<Icon name="arrow" size={15} /></span></Link>
        </aside>
      </div>
    </div>
  );
}
