'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { PageHeader, WorkspaceIcon } from '@/components/ui/Workspace';
import { LoadingState } from '@/components/ui/LoadingState';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { RatesSettingsTab } from '@/components/settings/RatesSettingsTab';
import { EarningsSettingsTab } from '@/components/settings/EarningsSettingsTab';
import { DeductionsSettingsTab } from '@/components/settings/DeductionsSettingsTab';
import { SuperAdminSettingsTab } from '@/components/settings/SuperAdminSettingsTab';
import { PayrollSettings, EarningType, DeductionType } from '@/types/payroll';
import {
  getPayrollSettings,
  getEarningTypes,
  getDeductionTypes,
} from '@/lib/payroll/settings-actions';

type SettingsTab = 'general' | 'rates' | 'earnings' | 'deductions' | 'superadmin';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [loading, setLoading] = useState(true);

  const [settings, setSettings] = useState<PayrollSettings | null>(null);
  const [earnings, setEarnings] = useState<EarningType[]>([]);
  const [deductions, setDeductions] = useState<DeductionType[]>([]);

  useEffect(() => {
    async function loadAllSettings() {
      try {
        setLoading(true);
        // Check URL query param for default tab
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const tabParam = params.get('tab');
          if (tabParam === 'superadmin' || tabParam === 'rates' || tabParam === 'earnings' || tabParam === 'deductions') {
            setActiveTab(tabParam as SettingsTab);
          }
        }

        const [loadedSettings, loadedEarnings, loadedDeductions] = await Promise.all([
          getPayrollSettings(),
          getEarningTypes(),
          getDeductionTypes(),
        ]);
        setSettings(loadedSettings);
        setEarnings(loadedEarnings);
        setDeductions(loadedDeductions);
      } finally {
        setLoading(false);
      }
    }

    loadAllSettings();
  }, []);

  return (
    <AppShell pageTitle="Payroll Configuration">
      {/* Header Bar */}
      <PageHeader eyebrow="WORKSPACE CONFIGURATION" title="Payroll settings" description="Manage pay schedules, earnings, deductions, and company preferences." />

      <div className="workspace-settings">
        <nav className="workspace-settings-nav" aria-label="Payroll settings sections">
          <div className="workspace-settings-nav-label">CONFIGURATION</div>
          {([
            { key: 'general', label: 'General settings', description: 'Company and pay schedules', icon: 'calendar' },
            { key: 'rates', label: 'Rates & rules', description: 'Contribution and premium rates', icon: 'settings' },
            { key: 'earnings', label: 'Earnings', description: 'Allowances and pay categories', icon: 'wallet', count: earnings.length },
            { key: 'deductions', label: 'Deductions', description: 'Loans and deduction categories', icon: 'document', count: deductions.length },
            { key: 'superadmin', label: 'Administration', description: 'Company and access controls', icon: 'shield' },
          ] as const).map(item => <button key={item.key} type="button" aria-pressed={activeTab === item.key} onClick={() => setActiveTab(item.key)}>
            <WorkspaceIcon name={item.icon} size={19} />
            <span><strong>{item.label}</strong><small>{item.description}</small></span>
            {'count' in item && <span className="workspace-settings-count">{item.count}</span>}
          </button>)}
        </nav>
        <div className="workspace-settings-content">
      {/* Tab Content */}
      {loading ? (
        <div style={{ padding: '4rem 1rem' }}>
          <LoadingState
            title="Loading Payroll Configuration"
            message="Retrieving statutory schedules, multipliers, and benefit tables..."
          />
        </div>
      ) : (
        <>
          {activeTab === 'general' && settings && (
            <GeneralSettingsTab
              initialSettings={settings}
              onSaved={(updated) => setSettings(updated)}
            />
          )}

          {activeTab === 'rates' && settings && (
            <RatesSettingsTab
              initialSettings={settings}
              onSaved={(updated) => setSettings(updated)}
            />
          )}

          {activeTab === 'earnings' && (
            <EarningsSettingsTab initialEarnings={earnings} />
          )}

          {activeTab === 'deductions' && (
            <DeductionsSettingsTab initialDeductions={deductions} />
          )}

          {activeTab === 'superadmin' && settings && (
            <SuperAdminSettingsTab
              initialSettings={settings}
              onSaved={(updated) => setSettings(updated)}
            />
          )}
        </>
      )}
        </div>
      </div>
    </AppShell>
  );
}
