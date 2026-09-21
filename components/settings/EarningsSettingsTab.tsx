'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '@/components/ui/Table';
import { EarningType, EarningTypeFormData, EarningCategory } from '@/types/payroll';
import {
  createEarningType,
  updateEarningType,
  deleteEarningType,
} from '@/lib/payroll/settings-actions';

interface EarningsSettingsTabProps {
  initialEarnings: EarningType[];
}

export const EarningsSettingsTab: React.FC<EarningsSettingsTabProps> = ({
  initialEarnings,
}) => {
  const [earnings, setEarnings] = useState<EarningType[]>(initialEarnings);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EarningType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<EarningTypeFormData>({
    name: '',
    code: '',
    category: 'allowance',
    taxable: false,
    is_deminimis: false,
    deminimis_limit: 0,
    description: '',
    is_active: true,
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      category: 'allowance',
      taxable: false,
      is_deminimis: false,
      deminimis_limit: 0,
      description: '',
      is_active: true,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EarningType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      category: item.category,
      taxable: item.taxable,
      is_deminimis: item.is_deminimis,
      deminimis_limit: item.deminimis_limit || 0,
      description: item.description || '',
      is_active: item.is_active,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (item: EarningType) => {
    const newStatus = !item.is_active;
    const res = await updateEarningType(item.id, { is_active: newStatus });
    if (res.success && res.data) {
      setEarnings(earnings.map((e) => (e.id === item.id ? res.data! : e)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this earning category?')) {
      const res = await deleteEarningType(id);
      if (res.success) {
        setEarnings(earnings.filter((e) => e.id !== id));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      setError('Name and Code are required fields.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      if (editingItem) {
        const res = await updateEarningType(editingItem.id, formData);
        if (res.success && res.data) {
          setEarnings(earnings.map((e) => (e.id === editingItem.id ? res.data! : e)));
          setIsModalOpen(false);
        } else {
          setError(res.error || 'Failed to update earning category');
        }
      } else {
        const res = await createEarningType(formData);
        if (res.success && res.data) {
          setEarnings([...earnings, res.data]);
          setIsModalOpen(false);
        } else {
          setError(res.error || 'Failed to create earning category');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryBadge = (category: EarningCategory) => {
    switch (category) {
      case 'allowance':
        return <Badge variant="brand">Allowance</Badge>;
      case 'bonus':
        return <Badge variant="success">Bonus / Incentive</Badge>;
      case 'commission':
        return <Badge variant="info">Commission</Badge>;
      case 'reimbursement':
        return <Badge variant="neutral">Reimbursement</Badge>;
      default:
        return <Badge variant="neutral">{category}</Badge>;
    }
  };

  return (
    <div>
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <CardTitle>Earning & Allowance Categories</CardTitle>
              <CardSubtitle>Configure taxable allowances, statutory de minimis benefits, and discretionary bonuses</CardSubtitle>
            </div>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Earning Category
            </Button>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Category Name & Code</TableHeaderCell>
                  <TableHeaderCell>Classification</TableHeaderCell>
                  <TableHeaderCell>Tax Treatment</TableHeaderCell>
                  <TableHeaderCell align="right">De Minimis Cap</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell align="center">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {earnings.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <strong style={{ color: 'var(--brand-dark-blue)' }}>{item.name}</strong>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontWeight: 600 }}>
                            {item.code}
                          </span>
                          {item.description && ` — ${item.description}`}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(item.category)}</TableCell>
                    <TableCell>
                      {item.taxable ? (
                        <Badge variant="warning">Taxable Income</Badge>
                      ) : item.is_deminimis ? (
                        <Badge variant="success" dot>De Minimis (Non-taxable)</Badge>
                      ) : (
                        <Badge variant="info">Non-Taxable Benefit</Badge>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {item.is_deminimis && item.deminimis_limit ? (
                        <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                          ₱{Number(item.deminimis_limit).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        onClick={() => handleToggleActive(item)}
                        style={{ cursor: 'pointer' }}
                        title="Click to toggle status"
                      >
                        {item.is_active ? (
                          <Badge variant="success" dot>Active</Badge>
                        ) : (
                          <Badge variant="neutral">Disabled</Badge>
                        )}
                      </span>
                    </TableCell>
                    <TableCell align="center">
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        <Button variant="ghost" size="sm" onClick={() => openEditModal(item)}>
                          Edit
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(item.id)}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardBody>
      </Card>

      {/* Modal for Add / Edit Earning Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Earning Category' : 'Create New Earning Category'}
        size="md"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={handleSubmit} isLoading={isSaving}>
              {editingItem ? 'Save Changes' : 'Create Category'}
            </Button>
          </>
        }
      >
        {error && (
          <div className="alert-box alert-error" style={{ marginBottom: '1rem' }}>
            <span>{error}</span>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input
            label="Category Name"
            placeholder="e.g. Communication & Internet Allowance"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="form-grid-2">
            <Input
              label="Earning Code"
              placeholder="e.g. COMM_ALLOW"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText="Unique identifier used in payslips"
              required
            />

            <Select
              label="Type Classification"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as EarningCategory })
              }
              options={[
                { label: 'Allowance', value: 'allowance' },
                { label: 'Bonus / Incentive', value: 'bonus' },
                { label: 'Sales Commission', value: 'commission' },
                { label: 'Expense Reimbursement', value: 'reimbursement' },
                { label: 'Other Earnings', value: 'other' },
              ]}
            />
          </div>

          <div
            style={{
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.taxable}
                onChange={(e) => setFormData({ ...formData, taxable: e.target.checked })}
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-dark-blue)' }}>
                Subject to Withholding Tax (Taxable)
              </span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formData.is_deminimis}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    is_deminimis: e.target.checked,
                    taxable: e.target.checked ? false : formData.taxable,
                  })
                }
              />
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--brand-dark-blue)' }}>
                Qualifies as Statutory De Minimis Benefit (Non-taxable)
              </span>
            </label>

            {formData.is_deminimis && (
              <div style={{ marginTop: '0.25rem' }}>
                <Input
                  label="Monthly De Minimis Limit (₱)"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.deminimis_limit}
                  onChange={(e) =>
                    setFormData({ ...formData, deminimis_limit: parseFloat(e.target.value) || 0 })
                  }
                  helperText="Excess amount above this threshold is considered taxable"
                />
              </div>
            )}
          </div>

          <Input
            label="Description & Policy Notes"
            placeholder="e.g. Granted to full-time employees under hybrid setup"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
