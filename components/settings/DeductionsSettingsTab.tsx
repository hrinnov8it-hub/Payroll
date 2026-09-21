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
import { DeductionType, DeductionTypeFormData, DeductionCategory } from '@/types/payroll';
import {
  createDeductionType,
  updateDeductionType,
  deleteDeductionType,
} from '@/lib/payroll/settings-actions';

interface DeductionsSettingsTabProps {
  initialDeductions: DeductionType[];
}

export const DeductionsSettingsTab: React.FC<DeductionsSettingsTabProps> = ({
  initialDeductions,
}) => {
  const [deductions, setDeductions] = useState<DeductionType[]>(initialDeductions);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<DeductionType | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState<DeductionTypeFormData>({
    name: '',
    code: '',
    category: 'loan',
    description: '',
    is_active: true,
  });

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      code: '',
      category: 'loan',
      description: '',
      is_active: true,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: DeductionType) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      code: item.code,
      category: item.category,
      description: item.description || '',
      is_active: item.is_active,
    });
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleActive = async (item: DeductionType) => {
    const newStatus = !item.is_active;
    const res = await updateDeductionType(item.id, { is_active: newStatus });
    if (res.success && res.data) {
      setDeductions(deductions.map((d) => (d.id === item.id ? res.data! : d)));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this deduction category?')) {
      const res = await deleteDeductionType(id);
      if (res.success) {
        setDeductions(deductions.filter((d) => d.id !== id));
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
        const res = await updateDeductionType(editingItem.id, formData);
        if (res.success && res.data) {
          setDeductions(deductions.map((d) => (d.id === editingItem.id ? res.data! : d)));
          setIsModalOpen(false);
        } else {
          setError(res.error || 'Failed to update deduction category');
        }
      } else {
        const res = await createDeductionType(formData);
        if (res.success && res.data) {
          setDeductions([...deductions, res.data]);
          setIsModalOpen(false);
        } else {
          setError(res.error || 'Failed to create deduction category');
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  const getCategoryBadge = (category: DeductionCategory) => {
    switch (category) {
      case 'loan':
        return <Badge variant="brand">Loan Amortization</Badge>;
      case 'insurance':
        return <Badge variant="info">HMO / Insurance</Badge>;
      case 'company':
        return <Badge variant="neutral">Company Account</Badge>;
      case 'statutory':
        return <Badge variant="danger">Statutory</Badge>;
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
              <CardTitle>Deduction & Loan Categories</CardTitle>
              <CardSubtitle>Manage non-statutory employee loan repayments, HMO premium co-pays, and cash advances</CardSubtitle>
            </div>
            <Button variant="primary" size="sm" onClick={openAddModal}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px' }}>
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="16" />
                <line x1="8" y1="12" x2="16" y2="12" />
              </svg>
              Add Deduction Category
            </Button>
          </div>
        </CardHeader>
        <CardBody style={{ padding: 0 }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Deduction Name & Code</TableHeaderCell>
                  <TableHeaderCell>Category Type</TableHeaderCell>
                  <TableHeaderCell>Description / Purpose</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell align="center">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {deductions.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div>
                        <strong style={{ color: 'var(--brand-dark-blue)' }}>{item.name}</strong>
                        <div>
                          <span style={{ fontFamily: 'monospace', color: 'var(--brand-blue)', fontSize: '0.8rem', fontWeight: 600 }}>
                            {item.code}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{getCategoryBadge(item.category)}</TableCell>
                    <TableCell>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                        {item.description || '—'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        onClick={() => handleToggleActive(item)}
                        style={{ cursor: 'pointer' }}
                        title="Click to toggle active state"
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

      {/* Modal for Add / Edit Deduction Category */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingItem ? 'Edit Deduction Category' : 'Create Deduction Category'}
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
            label="Deduction Name"
            placeholder="e.g. SSS Calamity Loan Amortization"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="form-grid-2">
            <Input
              label="Deduction Code"
              placeholder="e.g. SSS_CALAMITY"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              helperText="Unique code shown in payroll line items"
              required
            />

            <Select
              label="Classification Category"
              value={formData.category}
              onChange={(e) =>
                setFormData({ ...formData, category: e.target.value as DeductionCategory })
              }
              options={[
                { label: 'Loan Repayment', value: 'loan' },
                { label: 'Medical / HMO Insurance', value: 'insurance' },
                { label: 'Company Cash Advance / Other', value: 'company' },
                { label: 'Statutory / Legal', value: 'statutory' },
                { label: 'Miscellaneous', value: 'other' },
              ]}
            />
          </div>

          <Input
            label="Description & Guidance"
            placeholder="e.g. Bi-monthly installment deducted until fully amortized"
            value={formData.description || ''}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};
