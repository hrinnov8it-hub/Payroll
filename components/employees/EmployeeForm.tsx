'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardSubtitle, CardBody, CardFooter } from '@/components/ui/Card';
import {
  Department,
  Position,
  EmployeeWithRelations,
  EmployeeFormData,
  EmploymentType,
  PayType,
  EmployeeStatus,
} from '@/types/employee';
import { getDepartments, getPositions, calculateHourlyRate } from '@/lib/employees/actions';

interface EmployeeFormProps {
  initialData?: EmployeeWithRelations | null;
  onSubmit: (data: EmployeeFormData) => Promise<{ success: boolean; error?: string }>;
  isSubmitting?: boolean;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting = false,
}) => {
  const router = useRouter();

  const [departments, setDepartments] = useState<Department[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [loadingLookups, setLoadingLookups] = useState(true);

  // Form State
  const [formData, setFormData] = useState<EmployeeFormData>({
    employee_number: initialData?.employee_number || '',
    first_name: initialData?.first_name || '',
    middle_name: initialData?.middle_name || '',
    last_name: initialData?.last_name || '',
    email: initialData?.email || '',
    department_id: initialData?.department_id || '',
    position_id: initialData?.position_id || '',
    employment_type: initialData?.employment_type || 'regular',
    pay_type: initialData?.pay_type || 'monthly',
    basic_salary: initialData?.basic_salary || 0,
    hourly_rate: initialData?.hourly_rate || 0,
    hire_date: initialData?.hire_date || new Date().toISOString().split('T')[0],
    status: initialData?.status || 'active',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);

  // Fetch departments and positions
  useEffect(() => {
    async function loadLookups() {
      try {
        const [depts, pos] = await Promise.all([getDepartments(), getPositions()]);
        setDepartments(depts);
        setPositions(pos);

        // Pre-select first dept/position if not set
        if (!initialData && depts.length > 0 && !formData.department_id) {
          const firstDeptId = depts[0].id;
          const matchingPos = pos.filter((p) => p.department_id === firstDeptId);
          setFormData((prev) => ({
            ...prev,
            department_id: firstDeptId,
            position_id: matchingPos.length > 0 ? matchingPos[0].id : (pos[0]?.id || ''),
          }));
        }
      } finally {
        setLoadingLookups(false);
      }
    }
    loadLookups();
  }, [initialData]);

  // Recalculate hourly rate preview when salary or pay type changes
  const handleSalaryChange = (value: number, payType: PayType) => {
    const computed = calculateHourlyRate(value, payType);
    setFormData((prev) => ({
      ...prev,
      basic_salary: value,
      pay_type: payType,
      hourly_rate: computed,
    }));
  };

  const handleDepartmentChange = (deptId: string) => {
    const matchingPos = positions.filter((p) => p.department_id === deptId);
    setFormData((prev) => ({
      ...prev,
      department_id: deptId,
      position_id: matchingPos.length > 0 ? matchingPos[0].id : '',
    }));
  };

  const handleAutoGenerateNumber = () => {
    const randomNum = Math.floor(100 + Math.random() * 900);
    const currentYear = new Date().getFullYear();
    setFormData((prev) => ({
      ...prev,
      employee_number: `INV-${currentYear}-${randomNum}`,
    }));
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.employee_number.trim()) {
      newErrors.employee_number = 'Employee number is required.';
    }
    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required.';
    }
    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email address is required.';
    } else if (!formData.email.includes('@')) {
      newErrors.email = 'Please enter a valid email address.';
    }
    if (!formData.department_id) {
      newErrors.department_id = 'Department is required.';
    }
    if (!formData.position_id) {
      newErrors.position_id = 'Position is required.';
    }
    if (formData.basic_salary < 0) {
      newErrors.basic_salary = 'Basic salary cannot be negative.';
    }
    if (!formData.hire_date) {
      newErrors.hire_date = 'Hire date is required.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    if (!validate()) return;

    const res = await onSubmit(formData);
    if (!res.success && res.error) {
      setServerError(res.error);
    }
  };

  const filteredPositions = formData.department_id
    ? positions.filter((p) => !p.department_id || p.department_id === formData.department_id)
    : positions;

  return (
    <form onSubmit={handleSubmit} className="employee-form-container">
      {serverError && (
        <div className="alert-box alert-error" style={{ marginBottom: '1.5rem' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{serverError}</span>
        </div>
      )}

      {/* Section 1: Personal Information */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardSubtitle>Basic employee identity and primary corporate email address</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Input
              label="First Name"
              placeholder="e.g. Maria Cristina"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              error={errors.first_name}
              required
            />
            <Input
              label="Middle Name"
              placeholder="e.g. Alvarez (Optional)"
              value={formData.middle_name || ''}
              onChange={(e) => setFormData({ ...formData, middle_name: e.target.value })}
            />
            <Input
              label="Last Name"
              placeholder="e.g. Del Rosario"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              error={errors.last_name}
              required
            />
          </div>

          <div className="form-grid-2" style={{ marginTop: '1rem' }}>
            <Input
              label="Corporate Email Address"
              type="email"
              placeholder="name@innov8it.ph"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              error={errors.email}
              required
              helperText="Used for authentication, notifications, and confidential payslip delivery"
            />
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="input-label" style={{ margin: 0 }}>
                  Employee Number <span style={{ color: 'var(--brand-accent)' }}>*</span>
                </label>
                <button
                  type="button"
                  onClick={handleAutoGenerateNumber}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--brand-blue)',
                    fontSize: '0.8rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    padding: 0,
                  }}
                >
                  Generate Suggestion
                </button>
              </div>
              <Input
                placeholder="e.g. INV-2026-008"
                value={formData.employee_number}
                onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                error={errors.employee_number}
                required
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Section 2: Department & Role */}
      <Card style={{ marginBottom: '1.5rem' }}>
        <CardHeader>
          <CardTitle>Job Role & Department</CardTitle>
          <CardSubtitle>Assign the employee to their operational business unit and designated position</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-2">
            <Select
              label="Department"
              value={formData.department_id}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              error={errors.department_id}
              required
              disabled={loadingLookups}
              options={departments.map((dept) => ({
                label: `${dept.name} (${dept.code})`,
                value: dept.id,
              }))}
            />

            <Select
              label="Position / Designation"
              value={formData.position_id}
              onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
              error={errors.position_id}
              required
              disabled={loadingLookups || filteredPositions.length === 0}
              options={filteredPositions.map((pos) => ({
                label: pos.title,
                value: pos.id,
              }))}
            />
          </div>

          <div className="form-grid-3" style={{ marginTop: '1rem' }}>
            <Select
              label="Employment Type"
              value={formData.employment_type}
              onChange={(e) =>
                setFormData({ ...formData, employment_type: e.target.value as EmploymentType })
              }
              options={[
                { label: 'Regular Full-Time', value: 'regular' },
                { label: 'Probationary', value: 'probationary' },
                { label: 'Contractual / Project-based', value: 'contractual' },
                { label: 'Part-Time', value: 'part_time' },
              ]}
            />

            <Input
              label="Hire Date"
              type="date"
              value={formData.hire_date}
              onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
              error={errors.hire_date}
              required
            />

            <Select
              label="Status"
              value={formData.status}
              onChange={(e) =>
                setFormData({ ...formData, status: e.target.value as EmployeeStatus })
              }
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive / On Leave', value: 'inactive' },
                { label: 'Terminated / Resigned', value: 'terminated' },
              ]}
            />
          </div>
        </CardBody>
      </Card>

      {/* Section 3: Compensation & Payroll Configuration */}
      <Card style={{ marginBottom: '2rem' }}>
        <CardHeader>
          <CardTitle>Compensation & Salary Structure</CardTitle>
          <CardSubtitle>Basic compensation setup and statutory hourly rate derivation</CardSubtitle>
        </CardHeader>
        <CardBody>
          <div className="form-grid-3">
            <Select
              label="Pay Schedule Type"
              value={formData.pay_type}
              onChange={(e) =>
                handleSalaryChange(formData.basic_salary, e.target.value as PayType)
              }
              options={[
                { label: 'Monthly Fixed Rate', value: 'monthly' },
                { label: 'Daily Rate Basis', value: 'daily' },
                { label: 'Hourly Rate Basis', value: 'hourly' },
              ]}
            />

            <Input
              label={
                formData.pay_type === 'monthly'
                  ? 'Monthly Basic Salary (₱)'
                  : formData.pay_type === 'daily'
                  ? 'Daily Rate (₱)'
                  : 'Hourly Rate (₱)'
              }
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={formData.basic_salary === 0 ? '' : formData.basic_salary}
              onChange={(e) =>
                handleSalaryChange(parseFloat(e.target.value) || 0, formData.pay_type)
              }
              error={errors.basic_salary}
              required
              helperText="Gross base compensation before statutory deductions"
            />

            <div>
              <Input
                label="Effective Hourly Rate (₱)"
                type="number"
                min="0"
                step="0.01"
                value={formData.hourly_rate}
                onChange={(e) =>
                  setFormData({ ...formData, hourly_rate: parseFloat(e.target.value) || 0 })
                }
                helperText={
                  formData.pay_type === 'monthly'
                    ? 'PH Std: (Monthly × 12) ÷ (261 days × 8 hrs)'
                    : 'Basis for OT & Night Differential'
                }
              />
            </div>
          </div>

          <div
            style={{
              marginTop: '1.25rem',
              padding: '1rem',
              backgroundColor: '#f8fafc',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--brand-dark-blue)' }}>
                Estimated Daily Rate:
              </strong>
              <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>
                ₱{(formData.hourly_rate * 8).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--brand-dark-blue)' }}>
                Estimated Semi-Monthly Base:
              </strong>
              <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontWeight: 600 }}>
                ₱{(formData.basic_salary / 2).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div>
              <strong style={{ fontSize: '0.88rem', color: 'var(--brand-dark-blue)' }}>
                Overtime Base / Hr (125%):
              </strong>
              <span style={{ marginLeft: '0.5rem', fontFamily: 'monospace', fontWeight: 600, color: 'var(--brand-accent)' }}>
                ₱{(formData.hourly_rate * 1.25).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardBody>
        <CardFooter style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/employees')}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isSubmitting}>
            {initialData ? 'Save Employee Changes' : 'Create Employee Record'}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};
