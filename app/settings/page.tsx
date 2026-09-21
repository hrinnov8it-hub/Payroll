'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Badge } from '@/components/ui/Badge';
import { LoadingState } from '@/components/ui/LoadingState';
import { GeneralSettingsTab } from '@/components/settings/GeneralSettingsTab';
import { RatesSettingsTab } from '@/components/settings/RatesSettingsTab';
import { EarningsSettingsTab } from '@/components/settings/EarningsSettingsTab';
import { DeductionsSettingsTab } from '@/components/settings/DeductionsSettingsTab';
import { PayrollSettings, EarningType, DeductionType } from '@/types/payroll';
import {
  getPayrollSettings,
  getEarningTypes,
  getDeductionTypes,
} from '@/lib/payroll/settings-actions';

type SettingsTab = 'general' | 'rates' | 'earnings' | 'deductions';

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
      <div className="dashboard-header">
        <div className="dashboard-title-area">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h1 style={{ margin: 0 }}>Payroll Configuration & Rules</h1>
            <Badge variant="success" dot>DOLE Compliant</Badge>
          </div>
          <p>
            Manage disbursement cycles, statutory rate multipliers, taxable earnings, and loan deduction categories.
          </p>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="settings-tabs-container" style={{ marginBottom: '1.5rem' }}>
        <div className="tab-pills">
          <button
            type="button"
            className={`tab-pill ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
              <line x1="16" x2="16" y1="2" y2="6" />
              <line x1="8" x2="8" y1="2" y2="6" />
              <line x1="3" x2="21" y1="10" y2="10" />
            </svg>
            Schedule & Operations
          </button>

          <button
            type="button"
            className={`tab-pill ${activeTab === 'rates' ? 'active' : ''}`}
            onClick={() => setActiveTab('rates')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Statutory Rates & Multipliers
          </button>

          <button
            type="button"
            className={`tab-pill ${activeTab === 'earnings' ? 'active' : ''}`}
            onClick={() => setActiveTab('earnings')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
            Earning & Allowance Types
            <span className="tab-pill-badge">{earnings.length}</span>
          </button>

          <button
            type="button"
            className={`tab-pill ${activeTab === 'deductions' ? 'active' : ''}`}
            onClick={() => setActiveTab('deductions')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
              <circle cx="12" cy="12" r="10" />
              <line x1="8" y1="12" x2="16" y2="12" />
            </svg>
            Deduction & Loan Types
            <span className="tab-pill-badge">{deductions.length}</span>
          </button>
        </div>
      </div>

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
        </>
      )}
    </AppShell>
  );
}
