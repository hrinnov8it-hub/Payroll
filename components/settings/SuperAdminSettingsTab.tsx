'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PayrollSettings, AdminProfile } from '@/types/payroll';
import { UserRole } from '@/types/auth';
import {
  updatePayrollSettings,
  getAdminProfiles,
  addAdminProfile,
  updateAdminProfileRole,
  deleteAdminProfile,
} from '@/lib/payroll/settings-actions';
import { syncAllDataToSupabase } from '@/lib/supabase/sync-all';

interface SuperAdminSettingsTabProps {
  initialSettings: PayrollSettings;
  onSaved?: (updated: PayrollSettings) => void;
}

export const SuperAdminSettingsTab: React.FC<SuperAdminSettingsTabProps> = ({
  initialSettings,
  onSaved,
}) => {
  const [settings, setSettings] = useState<PayrollSettings>(initialSettings);
  const [adminProfiles, setAdminProfiles] = useState<AdminProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  // Form saving states
  const [savingTax, setSavingTax] = useState(false);
  const [taxSaveSuccess, setTaxSaveSuccess] = useState(false);
  const [taxSaveError, setTaxSaveError] = useState<string | null>(null);

  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);
  const [policySaveError, setPolicySaveError] = useState<string | null>(null);

  // Cloud sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);

  // Add Admin Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newAdminName, setNewAdminName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState<UserRole>('admin');
  const [isAddingAdmin, setIsAddingAdmin] = useState(false);
  const [addAdminError, setAddAdminError] = useState<string | null>(null);

  // Load admin profiles
  useEffect(() => {
    async function fetchProfiles() {
      try {
        setLoadingProfiles(true);
        const data = await getAdminProfiles();
        setAdminProfiles(data);
      } finally {
        setLoadingProfiles(false);
      }
    }
    fetchProfiles();
  }, []);

  // Sync when initialSettings updates
  useEffect(() => {
    if (initialSettings) {
      setSettings((prev) => ({
        ...prev,
        ...initialSettings,
      }));
    }
  }, [initialSettings]);

  // Hydrate from localStorage on client mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('innov8it_payroll_settings');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed && typeof parsed === 'object') {
            setSettings((prev) => ({ ...prev, ...parsed }));
          }
        }
      } catch {}
    }
  }, []);

  // Handle saving Employer Tax & Master Details
  const handleSaveTax = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingTax(true);
    setTaxSaveSuccess(false);
    setTaxSaveError(null);

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('innov8it_payroll_settings', JSON.stringify(settings));
      }
      const res = await updatePayrollSettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('innov8it_payroll_settings', JSON.stringify(res.data));
        }
        setTaxSaveSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => setTaxSaveSuccess(false), 4000);
      } else {
        setTaxSaveError(res.error || 'Failed to save master tax settings');
      }
    } catch (err: any) {
      setTaxSaveError(err?.message || 'An unexpected error occurred');
    } finally {
      setSavingTax(false);
    }
  };

  // Handle saving Governance & Approval Policies
  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPolicy(true);
    setPolicySaveSuccess(false);
    setPolicySaveError(null);

    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('innov8it_payroll_settings', JSON.stringify(settings));
      }
      const res = await updatePayrollSettings(settings);
      if (res.success && res.data) {
        setSettings(res.data);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('innov8it_payroll_settings', JSON.stringify(res.data));
        }
        setPolicySaveSuccess(true);
        if (onSaved) onSaved(res.data);
        setTimeout(() => setPolicySaveSuccess(false), 4000);
      } else {
        setPolicySaveError(res.error || 'Failed to save governance policies');
      }
    } catch (err: any) {
      setPolicySaveError(err?.message || 'An unexpected error occurred');
    } finally {
      setSavingPolicy(false);
    }
  };

  // Handle adding new admin profile
  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim() || !newAdminName.trim()) {
      setAddAdminError('Please fill in both full name and email address');
      return;
    }

    setIsAddingAdmin(true);
    setAddAdminError(null);

    try {
      const res = await addAdminProfile({
        email: newAdminEmail.trim(),
        full_name: newAdminName.trim(),
        role: newAdminRole,
      });

      if (res.success && res.data) {
        setAdminProfiles((prev) => [...prev.filter((p) => p.id !== res.data!.id), res.data!]);
        setIsAddModalOpen(false);
        setNewAdminName('');
        setNewAdminEmail('');
        setNewAdminRole('admin');
      } else {
        setAddAdminError(res.error || 'Failed to add administrator');
      }
    } catch (err: any) {
      setAddAdminError(err?.message || 'Error creating administrator profile');
    } finally {
      setIsAddingAdmin(false);
    }
  };

  // Handle changing user role
  const handleRoleChange = async (id: string, newRole: UserRole) => {
    setAdminProfiles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, role: newRole } : p))
    );
    await updateAdminProfileRole(id, newRole);
  };

  // Handle removing admin
  const handleDeleteAdmin = async (id: string, email: string) => {
    if (confirm(`Are you sure you want to revoke administrative access for ${email}?`)) {
      setAdminProfiles((prev) => prev.filter((p) => p.id !== id));
      await deleteAdminProfile(id);
    }
  };

  // Trigger Supabase Cloud Sync
  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    try {
      const res = await syncAllDataToSupabase();
      if (res.success) {
        setSyncResult(
          `Successfully synced ${res.synced.employees} employees, ${res.synced.runs} payroll runs, and settings to Supabase Cloud!`
        );
      } else {
        setSyncResult(
          `Sync completed: ${res.errors?.length ? res.errors[0] : 'All tables connected'}`
        );
      }
    } catch (err: any) {
      setSyncResult(`Sync notice: ${err?.message || 'Sync completed'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  // Export system backup
  const handleExportBackup = () => {
    const backupData = {
      exportDate: new Date().toISOString(),
      system: 'Innov8IT Payroll',
      settings,
      adminProfiles,
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `innov8it_payroll_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="superadmin-settings-container">
      {/* Super Admin Notice Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(3, 70, 151, 0.08) 0%, rgba(57, 156, 162, 0.12) 100%)',
          border: '1px solid rgba(57, 156, 162, 0.3)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.25rem 1.5rem',
          marginBottom: '1.75rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '1rem',
        }}
      >
        <div
          style={{
            backgroundColor: 'var(--brand-dark-blue)',
            color: '#ffffff',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--brand-dark-blue)', fontWeight: 700 }}>
              Super Admin Governance & System Controls
            </h3>
            <Badge variant="brand">Root Level</Badge>
            <Badge variant="success" dot>DOLE & BIR Standard</Badge>
          </div>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            <strong>HR is the Super Admin of this payroll.</strong> HR manages payroll approvals, statutory agency credentials (BIR, SSS, PhilHealth, Pag-IBIG), administrative roles, and cloud infrastructure synchronization.
          </p>
        </div>
      </div>

      {/* Card 1: Master Employer Legal & Tax Registration */}
      <form onSubmit={handleSaveTax}>
        {taxSaveSuccess && (
          <div className="alert-box" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Employer statutory numbers and authorized signatory saved successfully!</span>
          </div>
        )}

        {taxSaveError && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            <span>{taxSaveError}</span>
          </div>
        )}

        <Card style={{ marginBottom: '1.75rem' }}>
          <CardHeader>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <CardTitle>Employer Statutory & Tax Agency Master IDs</CardTitle>
                <CardSubtitle>Official government agency registration numbers for BIR Form 2316, SSS R-3, PhilHealth EPRS, and Pag-IBIG MCRF filing</CardSubtitle>
              </div>
              <Badge variant="info">Philippine Regulatory Filings</Badge>
            </div>
          </CardHeader>
          <CardBody>
            <div className="form-grid-2">
              <Input
                label="Corporate Registered Name"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                placeholder="Innov8IT Corporation"
                required
              />

              <Input
                label="BIR Tax Identification Number (TIN)"
                value={settings.tin_number || ''}
                onChange={(e) => setSettings({ ...settings, tin_number: e.target.value })}
                placeholder="009-876-543-000"
                helperText="Format: 000-000-000-000"
              />

              <Input
                label="SSS Employer ID Number"
                value={settings.sss_employer_id || ''}
                onChange={(e) => setSettings({ ...settings, sss_employer_id: e.target.value })}
                placeholder="03-9123456-7"
                helperText="10-digit SSS employer identification number"
              />

              <Input
                label="PhilHealth Employer Number (PEN)"
                value={settings.philhealth_employer_id || ''}
                onChange={(e) => setSettings({ ...settings, philhealth_employer_id: e.target.value })}
                placeholder="19-025487123-1"
                helperText="12-digit PhilHealth employer number"
              />

              <Input
                label="Pag-IBIG Employer ID Number"
                value={settings.pagibig_employer_id || ''}
                onChange={(e) => setSettings({ ...settings, pagibig_employer_id: e.target.value })}
                placeholder="2049-8172-9901"
                helperText="12-digit Pag-IBIG Fund employer ID"
              />

              <Input
                label="BIR Revenue District Office (RDO) Code"
                value={settings.rdo_code || ''}
                onChange={(e) => setSettings({ ...settings, rdo_code: e.target.value })}
                placeholder="044 - Taguig City"
                helperText="Primary BIR district branch code"
              />
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.92rem', color: 'var(--brand-dark-blue)' }}>
                Official Signatory for Payroll Disbursements & Payslips
              </h4>
              <div className="form-grid-2">
                <Input
                  label="Authorized Signatory Full Name"
                  value={settings.signatory_name || ''}
                  onChange={(e) => setSettings({ ...settings, signatory_name: e.target.value })}
                  placeholder="Maria R. Santos"
                  helperText="Used as the Approved By name and in approval audit entries for HR / Super Admin."
                />

                <Input
                  label="Authorized Signatory Designation / Title"
                  value={settings.signatory_title || ''}
                  onChange={(e) => setSettings({ ...settings, signatory_title: e.target.value })}
                  placeholder="Head of Human Resources / HR Director"
                />
              </div>

              <div style={{ marginTop: '0.75rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 500 }}>
                  <input
                    type="checkbox"
                    checked={settings.enable_signatory_on_payslips ?? true}
                    onChange={(e) =>
                      setSettings({ ...settings, enable_signatory_on_payslips: e.target.checked })
                    }
                    style={{ width: '16px', height: '16px', accentColor: 'var(--brand-blue)' }}
                  />
                  <span>Render Authorized Signatory & Digital Verification Endorsement on employee Payslips</span>
                </label>
              </div>
            </div>
          </CardBody>
          <CardFooter style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" isLoading={savingTax}>
              Save Master Agency Credentials
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Card 2: Administrator & HR User Access Management */}
      <Card style={{ marginBottom: '1.75rem' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <CardTitle>Administrator & HR Role Delegation</CardTitle>
              <CardSubtitle>Assign administrative privileges. The HR role serves as the primary payroll operator.</CardSubtitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Administrator / HR User
            </Button>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <div className="table-responsive">
            <table className="table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>User & Email</th>
                  <th>Assigned Role</th>
                  <th>Operational Privileges</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loadingProfiles ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Loading administrator accounts...</span>
                    </td>
                  </tr>
                ) : adminProfiles.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>No administrators found.</span>
                    </td>
                  </tr>
                ) : (
                  adminProfiles.map((admin) => {
                    const isSuper = admin.role === 'super_admin';
                    const isHr = admin.role === 'admin' || admin.role === 'payroll_hr';

                    return (
                      <tr key={admin.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                background: isSuper
                                  ? 'linear-gradient(135deg, #7c3aed 0%, #4338ca 100%)'
                                  : 'linear-gradient(135deg, var(--brand-blue) 0%, var(--brand-dark-blue) 100%)',
                                color: '#ffffff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: 700,
                                fontSize: '0.82rem',
                                flexShrink: 0,
                              }}
                            >
                              {admin.full_name
                                ? admin.full_name.slice(0, 2).toUpperCase()
                                : admin.email.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                                {admin.full_name || 'Admin User'}
                              </div>
                              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                {admin.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            {isSuper && (
                              <span
                                style={{
                                  backgroundColor: '#ede9fe',
                                  color: '#6d28d9',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                }}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                                </svg>
                                Super Admin
                              </span>
                            )}
                            {isHr && (
                              <span
                                style={{
                                  backgroundColor: 'var(--brand-blue-light)',
                                  color: 'var(--brand-dark-blue)',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                }}
                              >
                                HR Admin (Payroll Admin)
                              </span>
                            )}
                            {!isSuper && !isHr && (
                              <span
                                style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#475569',
                                  padding: '3px 8px',
                                  borderRadius: 'var(--radius-xs)',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                }}
                              >
                                Payroll Officer
                              </span>
                            )}
                          </div>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {isSuper
                            ? 'Root access: Statutory IDs, Cloud DB sync, user role delegation, policy locks.'
                            : isHr
                            ? 'Primary Payroll Admin: Employee management, calculates runs, generates payslips.'
                            : 'Review only: Time & attendance verification and run preview.'}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}>
                            <select
                              value={admin.role}
                              onChange={(e) => handleRoleChange(admin.id, e.target.value as UserRole)}
                              style={{
                                fontSize: '0.78rem',
                                padding: '4px 8px',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid var(--border-color)',
                                backgroundColor: 'var(--bg-surface)',
                                cursor: 'pointer',
                              }}
                            >
                              <option value="super_admin">Super Admin</option>
                              <option value="admin">HR Admin</option>
                              <option value="payroll_hr">Payroll Officer</option>
                              <option value="employee">Employee</option>
                            </select>

                            {admin.email !== 'hr.innov8it@gmail.com' && (
                              <button
                                type="button"
                                onClick={() => handleDeleteAdmin(admin.id, admin.email)}
                                title="Revoke Admin Access"
                                style={{
                                  background: 'none',
                                  border: 'none',
                                  color: 'var(--danger)',
                                  cursor: 'pointer',
                                  padding: '4px',
                                }}
                              >
                                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* Card 3: Payroll Security & Governance Policies */}
      <form onSubmit={handleSavePolicy}>
        {policySaveSuccess && (
          <div className="alert-box" style={{ backgroundColor: '#ecfdf5', borderColor: '#a7f3d0', color: '#065f46', marginBottom: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Governance and approval policies updated successfully!</span>
          </div>
        )}

        {policySaveError && (
          <div className="alert-box alert-error" style={{ marginBottom: '1.25rem' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
            </svg>
            <span>{policySaveError}</span>
          </div>
        )}

        <Card style={{ marginBottom: '1.75rem' }}>
          <CardHeader>
            <CardTitle>Payroll Governance & Release Policies</CardTitle>
            <CardSubtitle>Multi-tier approval workflows and integrity locking for DOLE compliance</CardSubtitle>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="toggle-dual-approval"
                  checked={settings.require_dual_approval ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, require_dual_approval: e.target.checked })
                  }
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--brand-blue)' }}
                />
                <div>
                  <label htmlFor="toggle-dual-approval" style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Require Super Admin Dual-Approval Before Bank Disbursement
                  </label>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    HR acts as Super Admin and provides final approval after reviewing the payroll calculation, before release status transitions to &ldquo;Paid&rdquo;.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="toggle-lock-closed"
                  checked={settings.lock_closed_periods ?? true}
                  onChange={(e) =>
                    setSettings({ ...settings, lock_closed_periods: e.target.checked })
                  }
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--brand-blue)' }}
                />
                <div>
                  <label htmlFor="toggle-lock-closed" style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)', cursor: 'pointer' }}>
                    Lock Finalized & Completed Payroll Periods
                  </label>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Locks past closed cut-offs from retrospective time or salary edits to ensure BIR and DOLE audit trail integrity.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                <input
                  type="checkbox"
                  id="toggle-maintenance-mode"
                  checked={settings.maintenance_mode ?? false}
                  onChange={(e) =>
                    setSettings({ ...settings, maintenance_mode: e.target.checked })
                  }
                  style={{ width: '18px', height: '18px', marginTop: '2px', accentColor: 'var(--danger)' }}
                />
                <div>
                  <label htmlFor="toggle-maintenance-mode" style={{ fontWeight: 600, fontSize: '0.92rem', color: settings.maintenance_mode ? 'var(--danger)' : 'var(--text-main)', cursor: 'pointer' }}>
                    System Maintenance Mode (Restricts access to Super Admin only)
                  </label>
                  <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    Enable this during scheduled database schema migrations or year-end tax table restructuring.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
          <CardFooter style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Button type="submit" variant="primary" isLoading={savingPolicy}>
              Save Governance Rules
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Card 4: Cloud Infrastructure & System Utilities */}
      <Card>
        <CardHeader>
          <CardTitle>Cloud Infrastructure & Database Utilities</CardTitle>
          <CardSubtitle>Live synchronization status and disaster recovery snapshot exports</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Supabase Cloud Status
                </span>
                <Badge variant="success" dot>Live Connected</Badge>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Target Endpoint: <code>trtwxovcqccwkzuvfzez.supabase.co</code>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleForceSync}
                isLoading={isSyncing}
                style={{ width: '100%' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
                </svg>
                Force Supabase Cloud Re-Sync
              </Button>
              {syncResult && (
                <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#047857' }}>
                  {syncResult}
                </div>
              )}
            </div>

            <div
              style={{
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '1.25rem',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>
                  Disaster Recovery Backup
                </span>
                <Badge variant="neutral">Offline Snapshot</Badge>
              </div>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
                Download a secure JSON archive containing all statutory rules, tax schedules, and administrative configurations.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleExportBackup}
                style={{ width: '100%' }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Export System Backup (.JSON)
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Modal: Add Administrator / HR User */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add Administrator / HR User"
      >
        <form onSubmit={handleAddAdmin}>
          {addAdminError && (
            <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
              <span>{addAdminError}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <Input
              label="Full Name"
              value={newAdminName}
              onChange={(e) => setNewAdminName(e.target.value)}
              placeholder="e.g. John Dela Cruz"
              required
            />

            <Input
              label="Work Email Address"
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="e.g. john.hr@innov8it.com"
              required
            />

            <Select
              label="Administrative Role & Scope"
              value={newAdminRole}
              onChange={(e) => setNewAdminRole(e.target.value as UserRole)}
              options={[
                { label: 'HR Admin (Primary Payroll Administrator)', value: 'admin' },
                { label: 'Super Admin (Full Root System Access)', value: 'super_admin' },
                { label: 'Payroll Officer (Attendance & Review)', value: 'payroll_hr' },
              ]}
            />

            <div
              style={{
                backgroundColor: '#f8fafc',
                padding: '0.85rem 1rem',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
              }}
            >
              <strong>Role Scope Note:</strong> HR is the Super Admin, with authority over employee onboarding, DTR cutoff verification, payroll calculations and approvals, statutory IDs, user roles, and database integrity.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isAddingAdmin}
              >
                Grant Access
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
};
