'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { Badge } from '@/components/ui/Badge';
import {
  ReportType,
  ReportFilterOptions,
  ReportExecutiveKPIs,
  PayrollSummaryReportRow,
  DepartmentTotalsReportRow,
  GovernmentContributionsReport,
  TaxSummaryReportRow,
  OvertimeNightDiffReportRow,
  EmployeeHistoryReportRow,
} from '@/types/reports';
import {
  getExecutiveKPIs,
  getPayrollSummaryReport,
  getDepartmentTotalsReport,
  getGovernmentContributionsReport,
  getTaxSummaryReport,
  getOvertimeAndNightDiffReport,
  getEmployeePayrollHistory,
  generateReportCSV,
} from '@/lib/reports/actions';
import { getPayrollPeriods } from '@/lib/attendance/actions';
import { getEmployees } from '@/lib/employees/actions';

const formatPHP = (amount: number) => {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<ReportType>('summary');
  const [loading, setLoading] = useState(true);

  // Filters State
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');

  // Metadata State
  const [periods, setPeriods] = useState<any[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);

  // Report Data State
  const [kpis, setKpis] = useState<ReportExecutiveKPIs | null>(null);
  const [summaryRows, setSummaryRows] = useState<PayrollSummaryReportRow[]>([]);
  const [departmentRows, setDepartmentRows] = useState<DepartmentTotalsReportRow[]>([]);
  const [govtReport, setGovtReport] = useState<GovernmentContributionsReport | null>(null);
  const [govtSubTab, setGovtSubTab] = useState<'all' | 'sss' | 'phic' | 'hdmf'>('all');
  const [taxRows, setTaxRows] = useState<TaxSummaryReportRow[]>([]);
  const [otRows, setOtRows] = useState<OvertimeNightDiffReportRow[]>([]);
  const [employeeHistoryRows, setEmployeeHistoryRows] = useState<EmployeeHistoryReportRow[]>([]);

  // Load initial filter options
  useEffect(() => {
    async function loadMeta() {
      try {
        const [periodList, empList] = await Promise.all([
          getPayrollPeriods(),
          getEmployees(),
        ]);
        setPeriods(periodList || []);
        setEmployees(empList || []);

        const uniqueDepts = Array.from(
          new Set(
            (empList || [])
              .map((e: any) => e.department?.name || e.department_name)
              .filter(Boolean)
          )
        ) as string[];
        setDepartments(uniqueDepts.sort());

        if (empList && empList.length > 0) {
          setSelectedEmployeeId(empList[0].id);
        }
      } catch (err) {
        console.error('Failed loading metadata:', err);
      }
    }
    loadMeta();
  }, []);

  // Fetch report data whenever filters change
  const fetchReportData = async () => {
    setLoading(true);
    const filterOpts: ReportFilterOptions = {
      periodId: selectedPeriod || undefined,
      departmentId: selectedDepartment || undefined,
      searchQuery: searchQuery.trim() || undefined,
    };

    try {
      const [kpiRes, summaryRes, deptRes, govtRes, taxRes, otRes] = await Promise.all([
        getExecutiveKPIs(filterOpts),
        getPayrollSummaryReport(filterOpts),
        getDepartmentTotalsReport(filterOpts),
        getGovernmentContributionsReport(filterOpts),
        getTaxSummaryReport(filterOpts),
        getOvertimeAndNightDiffReport(filterOpts),
      ]);

      setKpis(kpiRes);
      setSummaryRows(summaryRes);
      setDepartmentRows(deptRes);
      setGovtReport(govtRes);
      setTaxRows(taxRes);
      setOtRows(otRes);

      if (selectedEmployeeId) {
        const hist = await getEmployeePayrollHistory(selectedEmployeeId);
        setEmployeeHistoryRows(hist);
      }
    } catch (err) {
      console.error('Error fetching report data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedDepartment, searchQuery]);

  // Fetch employee history when specific employee is changed
  useEffect(() => {
    if (selectedEmployeeId) {
      getEmployeePayrollHistory(selectedEmployeeId).then((res) => {
        setEmployeeHistoryRows(res);
      });
    }
  }, [selectedEmployeeId]);

  // CSV Export Handler
  const handleExportCSV = () => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];
    let filename = `innov8it-report-${activeTab}-${new Date().toISOString().slice(0, 10)}.csv`;

    switch (activeTab) {
      case 'summary':
        headers = [
          'Run Number',
          'Period Name',
          'Payout Date',
          'Status',
          'Headcount',
          'Basic Pay (PHP)',
          'Overtime (PHP)',
          'Night Diff (PHP)',
          'Holiday Pay (PHP)',
          'Allowances (PHP)',
          'Gross Pay (PHP)',
          'Att. Deductions (PHP)',
          'Statutory EE (PHP)',
          'Tax Withheld (PHP)',
          'Total Deductions (PHP)',
          'Net Pay (PHP)',
          'Employer Share (PHP)',
        ];
        rows = summaryRows.map((r) => [
          r.run_number,
          r.period_name,
          r.payout_date,
          r.status,
          r.total_employees,
          r.total_basic_pay,
          r.total_overtime_pay,
          r.total_night_diff_pay,
          r.total_holiday_pay,
          r.total_allowances,
          r.total_gross_pay,
          r.total_attendance_deductions,
          r.total_statutory_deductions,
          r.total_withholding_tax,
          r.total_deductions,
          r.total_net_pay,
          r.total_employer_contributions,
        ]);
        break;

      case 'department_totals':
        headers = [
          'Department',
          'Headcount',
          'Basic Pay (PHP)',
          'Overtime Pay (PHP)',
          'Night Diff (PHP)',
          'Allowances (PHP)',
          'Gross Pay (PHP)',
          'Att. Deductions (PHP)',
          'Statutory EE (PHP)',
          'Tax Withheld (PHP)',
          'Total Deductions (PHP)',
          'Employer Match (PHP)',
          'Net Pay (PHP)',
        ];
        rows = departmentRows.map((d) => [
          d.department_name,
          d.employee_count,
          d.total_basic_pay,
          d.total_overtime_pay,
          d.total_night_diff_pay,
          d.total_allowances,
          d.total_gross_pay,
          d.total_attendance_deductions,
          d.total_statutory_employee,
          d.total_withholding_tax,
          d.total_deductions,
          d.total_employer_contributions,
          d.total_net_pay,
        ]);
        break;

      case 'government_contributions':
        headers = [
          'Agency',
          'Employee Name',
          'Employee No',
          'Covered Comp (PHP)',
          'Employee Share (PHP)',
          'Employer Share (PHP)',
          'Total Remittance (PHP)',
        ];
        if (govtReport) {
          govtReport.sss_rows.forEach((s) => {
            rows.push([
              'SSS',
              s.employee_name,
              s.employee_number,
              s.monthly_salary_credit,
              s.total_ee,
              s.total_er,
              s.total_contribution,
            ]);
          });
          govtReport.philhealth_rows.forEach((p) => {
            rows.push([
              'PhilHealth',
              p.employee_name,
              p.employee_number,
              p.covered_monthly_salary,
              p.employee_share,
              p.employer_share,
              p.total_premium,
            ]);
          });
          govtReport.pagibig_rows.forEach((h) => {
            rows.push([
              'Pag-IBIG',
              h.employee_name,
              h.employee_number,
              h.covered_salary,
              h.total_employee_share,
              h.employer_mandatory,
              h.total_remittance,
            ]);
          });
        }
        break;

      case 'tax_summary':
        headers = [
          'Employee Name',
          'Employee No',
          'Department',
          'Gross Compensation (PHP)',
          'Statutory Exempt (PHP)',
          'Net Taxable Income (PHP)',
          'TRAIN Law Bracket',
          'Tax Withheld (PHP)',
        ];
        rows = taxRows.map((t) => [
          t.employee_name,
          t.employee_number,
          t.department,
          t.gross_taxable_compensation,
          t.statutory_contributions_exempt,
          t.net_taxable_compensation,
          t.tax_bracket_label,
          t.withholding_tax_amount,
        ]);
        break;

      case 'overtime_night_diff':
        headers = [
          'Employee Name',
          'Employee No',
          'Department',
          'Regular OT (hrs)',
          'Regular OT (PHP)',
          'Rest Day (hrs)',
          'Rest Day (PHP)',
          'Holiday (hrs)',
          'Holiday (PHP)',
          'Night Diff (hrs)',
          'Night Diff (PHP)',
          'Total Premium Pay (PHP)',
        ];
        rows = otRows.map((o) => [
          o.employee_name,
          o.employee_number,
          o.department,
          o.regular_overtime_hours,
          o.regular_overtime_pay,
          o.rest_day_hours,
          o.rest_day_pay,
          o.holiday_hours,
          o.holiday_pay,
          o.night_diff_hours,
          o.night_diff_pay,
          o.total_premium_pay,
        ]);
        break;

      case 'employee_history':
        headers = [
          'Period Name',
          'Payout Date',
          'Run Number',
          'Status',
          'Days Worked',
          'Basic Pay (PHP)',
          'Overtime (PHP)',
          'Night Diff (PHP)',
          'Holiday Pay (PHP)',
          'Allowances (PHP)',
          'Gross Pay (PHP)',
          'Att. Deductions (PHP)',
          'SSS (PHP)',
          'PhilHealth (PHP)',
          'Pag-IBIG (PHP)',
          'Tax (PHP)',
          'Total Deductions (PHP)',
          'Net Pay (PHP)',
        ];
        rows = employeeHistoryRows.map((h) => [
          h.period_name,
          h.payout_date,
          h.run_number,
          h.status,
          h.days_worked,
          h.basic_pay,
          h.overtime_pay,
          h.night_diff_pay,
          h.holiday_pay,
          h.allowances,
          h.gross_pay,
          h.attendance_deductions,
          h.sss_deduction,
          h.philhealth_deduction,
          h.pagibig_deduction,
          h.tax_deduction,
          h.total_deductions,
          h.net_pay,
        ]);
        break;
    }

    const csvContent = generateReportCSV(headers, rows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <AppShell>
      <div className="dashboard-container reports-print-container" style={{ paddingBottom: '4rem' }}>
        {/* Header Bar */}
        <div className="reports-no-print" style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--brand-dark-blue)', marginBottom: '0.25rem' }}>
                Reports & Compliance Center
              </h1>
              <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>
                Audit-ready payroll summaries, department cost allocations, DOLE overtime schedules, and Philippine statutory remittance reports.
              </p>
            </div>

            <div className="reports-actions-group">
              <Button variant="outline" size="sm" onClick={handlePrint} id="btn-print-report">
                🖨️ Print Report
              </Button>
              <Button variant="primary" size="sm" onClick={handleExportCSV} id="btn-export-csv">
                📥 Export CSV
              </Button>
            </div>
          </div>
        </div>

        {/* Executive KPI Metric Cards */}
        {kpis && (
          <div className="reports-kpi-grid">
            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Total Net Disbursed</span>
              <span className="reports-kpi-value">{formatPHP(kpis.total_payroll_disbursed)}</span>
              <span className="reports-kpi-sub">Transferred to enrolled employee accounts</span>
            </div>

            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Total Gross Earnings</span>
              <span className="reports-kpi-value">{formatPHP(kpis.total_gross_earnings)}</span>
              <span className="reports-kpi-sub">Inclusive of basic pay, OT & allowances</span>
            </div>

            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Government Remittances</span>
              <span className="reports-kpi-value" style={{ color: '#0369a1' }}>
                {formatPHP(kpis.total_government_remittances)}
              </span>
              <span className="reports-kpi-sub">Combined SSS, PhilHealth, HDMF & BIR Tax</span>
            </div>

            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Employer Contribution Burden</span>
              <span className="reports-kpi-value" style={{ color: '#047857' }}>
                {formatPHP(kpis.total_employer_burden)}
              </span>
              <span className="reports-kpi-sub">Employer statutory counterpart share</span>
            </div>

            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Overtime & Premiums</span>
              <span className="reports-kpi-value" style={{ color: '#b45309' }}>
                {formatPHP(kpis.total_overtime_and_premiums)}
              </span>
              <span className="reports-kpi-sub">DOLE regular OT, holiday & night diff</span>
            </div>

            <div className="reports-kpi-card">
              <span className="reports-kpi-label">Active Headcount Processed</span>
              <span className="reports-kpi-value">{kpis.total_active_employees_processed}</span>
              <span className="reports-kpi-sub">Employees in designated report scope</span>
            </div>
          </div>
        )}

        {/* Global Filter Bar */}
        <div className="reports-filter-bar reports-no-print">
          <div className="reports-filter-inputs">
            {/* Payroll Period Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Payroll Period
              </label>
              <select
                className="reports-filter-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                id="select-report-period"
              >
                <option value="">All Payroll Periods</option>
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Department Filter */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Department
              </label>
              <select
                className="reports-filter-select"
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                id="select-report-department"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '0.2rem' }}>
                Filter Employee
              </label>
              <input
                type="text"
                placeholder="Search name or ID..."
                className="reports-search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                id="input-report-search"
              />
            </div>
          </div>

          {(selectedPeriod || selectedDepartment || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedPeriod('');
                setSelectedDepartment('');
                setSearchQuery('');
              }}
              id="btn-reset-report-filters"
            >
              Reset Filters
            </Button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="reports-tabs-nav reports-no-print">
          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
            id="tab-btn-summary"
          >
            📊 Payroll Summary
            <span className="reports-tab-badge">{summaryRows.length}</span>
          </button>

          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'department_totals' ? 'active' : ''}`}
            onClick={() => setActiveTab('department_totals')}
            id="tab-btn-departments"
          >
            🏢 Department Totals
            <span className="reports-tab-badge">{departmentRows.length}</span>
          </button>

          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'government_contributions' ? 'active' : ''}`}
            onClick={() => setActiveTab('government_contributions')}
            id="tab-btn-govt"
          >
            🏛️ Government Compliance (SSS / PHIC / HDMF)
          </button>

          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'tax_summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('tax_summary')}
            id="tab-btn-tax"
          >
            📑 BIR Tax Summary
            <span className="reports-tab-badge">{taxRows.length}</span>
          </button>

          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'overtime_night_diff' ? 'active' : ''}`}
            onClick={() => setActiveTab('overtime_night_diff')}
            id="tab-btn-overtime"
          >
            ⏱️ Overtime & Night Diff
            <span className="reports-tab-badge">{otRows.length}</span>
          </button>

          <button
            type="button"
            className={`reports-tab-btn ${activeTab === 'employee_history' ? 'active' : ''}`}
            onClick={() => setActiveTab('employee_history')}
            id="tab-btn-history"
          >
            👤 Employee History
          </button>
        </div>

        {/* Active Report Tab Content */}
        {loading ? (
          <div style={{ padding: '4rem 0' }}>
            <LoadingState message="Aggregating payroll and statutory report records..." />
          </div>
        ) : (
          <div>
            {/* 1. PAYROLL SUMMARY REPORT */}
            {activeTab === 'summary' && (
              <div className="reports-table-card">
                <div className="reports-table-header-bar">
                  <div>
                    <h3 className="reports-table-title">Payroll Runs Summary</h3>
                    <span className="reports-table-subtitle">Consolidated period disbursement summary</span>
                  </div>
                </div>

                <div className="reports-table-responsive">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Run Number</th>
                        <th>Period Name</th>
                        <th>Payout Date</th>
                        <th>Status</th>
                        <th className="reports-text-center">Staff</th>
                        <th className="reports-text-right">Basic Pay</th>
                        <th className="reports-text-right">Overtime</th>
                        <th className="reports-text-right">Night Diff</th>
                        <th className="reports-text-right">Holiday</th>
                        <th className="reports-text-right">Allowances</th>
                        <th className="reports-text-right">Gross Pay</th>
                        <th className="reports-text-right">Deductions</th>
                        <th className="reports-text-right">Net Take-Home</th>
                        <th className="reports-text-right">Employer Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summaryRows.map((r) => (
                        <tr key={r.run_id}>
                          <td>
                            <strong style={{ color: 'var(--brand-dark-blue)' }}>{r.run_number}</strong>
                          </td>
                          <td>{r.period_name}</td>
                          <td>{r.payout_date}</td>
                          <td>
                            <Badge variant={r.status === 'approved' ? 'success' : 'neutral'}>
                              {r.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="reports-text-center reports-mono">{r.total_employees}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(r.total_basic_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(r.total_overtime_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(r.total_night_diff_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(r.total_holiday_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(r.total_allowances)}</td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 700 }}>
                            {formatPHP(r.total_gross_pay)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#b91c1c' }}>
                            -{formatPHP(r.total_deductions)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                            {formatPHP(r.total_net_pay)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                            {formatPHP(r.total_employer_contributions)}
                          </td>
                        </tr>
                      ))}
                      {summaryRows.length === 0 && (
                        <tr>
                          <td colSpan={14} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No payroll run records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {summaryRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={4}>TOTALS</td>
                          <td className="reports-text-center reports-mono">
                            {summaryRows.reduce((sum, r) => sum + r.total_employees, 0)}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_basic_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_overtime_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_night_diff_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_holiday_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_allowances, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_gross_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#b91c1c' }}>
                            -{formatPHP(summaryRows.reduce((sum, r) => sum + r.total_deductions, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_net_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                            {formatPHP(summaryRows.reduce((sum, r) => sum + r.total_employer_contributions, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 2. DEPARTMENT TOTALS REPORT */}
            {activeTab === 'department_totals' && (
              <div className="reports-table-card">
                <div className="reports-table-header-bar">
                  <div>
                    <h3 className="reports-table-title">Department Cost Allocation</h3>
                    <span className="reports-table-subtitle">Compensation and tax burden grouped by organizational unit</span>
                  </div>
                </div>

                <div className="reports-table-responsive">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th className="reports-text-center">Headcount</th>
                        <th className="reports-text-right">Basic Pay</th>
                        <th className="reports-text-right">Overtime Pay</th>
                        <th className="reports-text-right">Night Diff</th>
                        <th className="reports-text-right">Allowances</th>
                        <th className="reports-text-right">Total Gross</th>
                        <th className="reports-text-right">Statutory EE</th>
                        <th className="reports-text-right">Tax Withheld</th>
                        <th className="reports-text-right">Total Deductions</th>
                        <th className="reports-text-right">Net Payout</th>
                        <th className="reports-text-right">Employer Match</th>
                      </tr>
                    </thead>
                    <tbody>
                      {departmentRows.map((d) => (
                        <tr key={d.department_name}>
                          <td>
                            <strong>{d.department_name}</strong>
                          </td>
                          <td className="reports-text-center reports-mono">{d.employee_count}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(d.total_basic_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(d.total_overtime_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(d.total_night_diff_pay)}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(d.total_allowances)}</td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 700 }}>
                            {formatPHP(d.total_gross_pay)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                            -{formatPHP(d.total_statutory_employee)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#dc2626' }}>
                            -{formatPHP(d.total_withholding_tax)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#b91c1c' }}>
                            -{formatPHP(d.total_deductions)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                            {formatPHP(d.total_net_pay)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                            {formatPHP(d.total_employer_contributions)}
                          </td>
                        </tr>
                      ))}
                      {departmentRows.length === 0 && (
                        <tr>
                          <td colSpan={12} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No department totals match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {departmentRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td>TOTALS</td>
                          <td className="reports-text-center reports-mono">
                            {departmentRows.reduce((sum, d) => sum + d.employee_count, 0)}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_basic_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_overtime_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_night_diff_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_allowances, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_gross_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                            -{formatPHP(departmentRows.reduce((sum, d) => sum + d.total_statutory_employee, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#dc2626' }}>
                            -{formatPHP(departmentRows.reduce((sum, d) => sum + d.total_withholding_tax, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#b91c1c' }}>
                            -{formatPHP(departmentRows.reduce((sum, d) => sum + d.total_deductions, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_net_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                            {formatPHP(departmentRows.reduce((sum, d) => sum + d.total_employer_contributions, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 3. GOVERNMENT REMITTANCE SCHEDULE REPORT */}
            {activeTab === 'government_contributions' && govtReport && (
              <div>
                {/* Statutory Agency Filter Bar */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }} className="reports-no-print">
                  <button
                    type="button"
                    className={`reports-tab-btn ${govtSubTab === 'all' ? 'active' : ''}`}
                    onClick={() => setGovtSubTab('all')}
                  >
                    All Agencies
                  </button>
                  <button
                    type="button"
                    className={`reports-tab-btn ${govtSubTab === 'sss' ? 'active' : ''}`}
                    onClick={() => setGovtSubTab('sss')}
                  >
                    SSS & WISP (RA 11199)
                  </button>
                  <button
                    type="button"
                    className={`reports-tab-btn ${govtSubTab === 'phic' ? 'active' : ''}`}
                    onClick={() => setGovtSubTab('phic')}
                  >
                    PhilHealth UHC (RA 11223)
                  </button>
                  <button
                    type="button"
                    className={`reports-tab-btn ${govtSubTab === 'hdmf' ? 'active' : ''}`}
                    onClick={() => setGovtSubTab('hdmf')}
                  >
                    Pag-IBIG / HDMF (RA 9679)
                  </button>
                </div>

                {/* SSS Table */}
                {(govtSubTab === 'all' || govtSubTab === 'sss') && (
                  <div className="reports-table-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="reports-table-header-bar">
                      <div>
                        <span className="reports-stat-badge badge-sss">SSS Schedule</span>
                        <h3 className="reports-table-title" style={{ marginTop: '0.35rem' }}>
                          Social Security System (SSS) & WISP Remittance Roster
                        </h3>
                        <span className="reports-table-subtitle">RA 11199: 4.5% EE Share, 9.5% ER Share, EC Fund, and WISP breakdown</span>
                      </div>
                      <div className="reports-mono" style={{ fontWeight: 800, color: '#0369a1', fontSize: '1.05rem' }}>
                        Total: {formatPHP(govtReport.totals.total_sss)}
                      </div>
                    </div>

                    <div className="reports-table-responsive">
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>Employee Name</th>
                            <th>Employee No</th>
                            <th className="reports-text-right">Salary Credit (MSC)</th>
                            <th className="reports-text-right">Regular EE</th>
                            <th className="reports-text-right">Regular ER</th>
                            <th className="reports-text-right">WISP EE</th>
                            <th className="reports-text-right">WISP ER</th>
                            <th className="reports-text-right">EC ER</th>
                            <th className="reports-text-right">Total EE Cutoff</th>
                            <th className="reports-text-right">Total ER Cutoff</th>
                            <th className="reports-text-right">Total Remittance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {govtReport.sss_rows.map((s) => (
                            <tr key={s.employee_id}>
                              <td><strong>{s.employee_name}</strong></td>
                              <td>{s.employee_number}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.monthly_salary_credit)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.regular_ee)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.regular_er)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.wisp_ee)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.wisp_er)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(s.ec_er)}</td>
                              <td className="reports-text-right reports-mono" style={{ color: '#0369a1', fontWeight: 700 }}>
                                {formatPHP(s.total_ee)}
                              </td>
                              <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                                {formatPHP(s.total_er)}
                              </td>
                              <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                                {formatPHP(s.total_contribution)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={8}>SSS TOTALS</td>
                            <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                              {formatPHP(govtReport.totals.total_sss_ee)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                              {formatPHP(govtReport.totals.total_sss_er)}
                            </td>
                            <td className="reports-text-right reports-mono">
                              {formatPHP(govtReport.totals.total_sss)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* PhilHealth Table */}
                {(govtSubTab === 'all' || govtSubTab === 'phic') && (
                  <div className="reports-table-card" style={{ marginBottom: '1.5rem' }}>
                    <div className="reports-table-header-bar">
                      <div>
                        <span className="reports-stat-badge badge-phic">PhilHealth Schedule</span>
                        <h3 className="reports-table-title" style={{ marginTop: '0.35rem' }}>
                          Philippine Health Insurance Corporation (PhilHealth) Roster
                        </h3>
                        <span className="reports-table-subtitle">RA 11223 (UHC Act): 5.0% Premium (2.5% EE, 2.5% ER) with ₱10k Floor and ₱100k Ceiling</span>
                      </div>
                      <div className="reports-mono" style={{ fontWeight: 800, color: '#047857', fontSize: '1.05rem' }}>
                        Total: {formatPHP(govtReport.totals.total_phic)}
                      </div>
                    </div>

                    <div className="reports-table-responsive">
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>Employee Name</th>
                            <th>Employee No</th>
                            <th className="reports-text-right">Covered Salary</th>
                            <th className="reports-text-center">Rate</th>
                            <th className="reports-text-right">EE Share Cutoff</th>
                            <th className="reports-text-right">ER Share Cutoff</th>
                            <th className="reports-text-right">Total Cutoff Premium</th>
                          </tr>
                        </thead>
                        <tbody>
                          {govtReport.philhealth_rows.map((p) => (
                            <tr key={p.employee_id}>
                              <td><strong>{p.employee_name}</strong></td>
                              <td>{p.employee_number}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(p.covered_monthly_salary)}</td>
                              <td className="reports-text-center reports-mono">{p.premium_rate}%</td>
                              <td className="reports-text-right reports-mono" style={{ color: '#0369a1', fontWeight: 700 }}>
                                {formatPHP(p.employee_share)}
                              </td>
                              <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                                {formatPHP(p.employer_share)}
                              </td>
                              <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                                {formatPHP(p.total_premium)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={4}>PHILHEALTH TOTALS</td>
                            <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                              {formatPHP(govtReport.totals.total_phic_ee)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                              {formatPHP(govtReport.totals.total_phic_er)}
                            </td>
                            <td className="reports-text-right reports-mono">
                              {formatPHP(govtReport.totals.total_phic)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Pag-IBIG Table */}
                {(govtSubTab === 'all' || govtSubTab === 'hdmf') && (
                  <div className="reports-table-card">
                    <div className="reports-table-header-bar">
                      <div>
                        <span className="reports-stat-badge badge-hdmf">Pag-IBIG Schedule</span>
                        <h3 className="reports-table-title" style={{ marginTop: '0.35rem' }}>
                          Home Development Mutual Fund (Pag-IBIG / HDMF) Roster
                        </h3>
                        <span className="reports-table-subtitle">RA 9679 & Circular 460: 2% EE and 2% ER matching on covered salary cap (₱10,000)</span>
                      </div>
                      <div className="reports-mono" style={{ fontWeight: 800, color: '#b45309', fontSize: '1.05rem' }}>
                        Total: {formatPHP(govtReport.totals.total_hdmf)}
                      </div>
                    </div>

                    <div className="reports-table-responsive">
                      <table className="reports-table">
                        <thead>
                          <tr>
                            <th>Employee Name</th>
                            <th>Employee No</th>
                            <th className="reports-text-right">Covered Salary</th>
                            <th className="reports-text-right">Mandatory EE</th>
                            <th className="reports-text-right">Voluntary EE</th>
                            <th className="reports-text-right">Employer Match</th>
                            <th className="reports-text-right">Total Remittance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {govtReport.pagibig_rows.map((h) => (
                            <tr key={h.employee_id}>
                              <td><strong>{h.employee_name}</strong></td>
                              <td>{h.employee_number}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(h.covered_salary)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(h.employee_mandatory)}</td>
                              <td className="reports-text-right reports-mono">{formatPHP(h.employee_voluntary)}</td>
                              <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                                {formatPHP(h.employer_mandatory)}
                              </td>
                              <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                                {formatPHP(h.total_remittance)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr>
                            <td colSpan={3}>PAG-IBIG TOTALS</td>
                            <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                              {formatPHP(govtReport.totals.total_hdmf_ee)}
                            </td>
                            <td className="reports-text-right reports-mono">₱0.00</td>
                            <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                              {formatPHP(govtReport.totals.total_hdmf_er)}
                            </td>
                            <td className="reports-text-right reports-mono">
                              {formatPHP(govtReport.totals.total_hdmf)}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. BIR WITHHOLDING TAX REPORT */}
            {activeTab === 'tax_summary' && (
              <div className="reports-table-card">
                <div className="reports-table-header-bar">
                  <div>
                    <h3 className="reports-table-title">BIR Withholding Tax Remittance Summary</h3>
                    <span className="reports-table-subtitle">Republic Act No. 10963 (TRAIN Law) & RA 11976 withholding tax schedule</span>
                  </div>
                  <div className="reports-mono" style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>
                    Total Tax: {formatPHP(taxRows.reduce((sum, t) => sum + t.withholding_tax_amount, 0))}
                  </div>
                </div>

                <div className="reports-table-responsive">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Employee No</th>
                        <th>Department</th>
                        <th className="reports-text-right">Gross Pay</th>
                        <th className="reports-text-right">Statutory Exemptions</th>
                        <th className="reports-text-right">Net Taxable Income</th>
                        <th>TRAIN Law Bracket</th>
                        <th className="reports-text-right">Tax Withheld</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxRows.map((t) => (
                        <tr key={t.employee_id}>
                          <td><strong>{t.employee_name}</strong></td>
                          <td>{t.employee_number}</td>
                          <td>{t.department}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(t.gross_taxable_compensation)}</td>
                          <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                            -{formatPHP(t.statutory_contributions_exempt)}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 700 }}>
                            {formatPHP(t.net_taxable_compensation)}
                          </td>
                          <td>
                            <span style={{ fontSize: '0.75rem', color: '#475569', background: '#f1f5f9', padding: '0.15rem 0.5rem', borderRadius: '4px' }}>
                              {t.tax_bracket_label}
                            </span>
                          </td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: '#dc2626' }}>
                            {formatPHP(t.withholding_tax_amount)}
                          </td>
                        </tr>
                      ))}
                      {taxRows.length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No tax records match the selected filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {taxRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3}>TAX TOTALS</td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(taxRows.reduce((sum, t) => sum + t.gross_taxable_compensation, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                            -{formatPHP(taxRows.reduce((sum, t) => sum + t.statutory_contributions_exempt, 0))}
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(taxRows.reduce((sum, t) => sum + t.net_taxable_compensation, 0))}
                          </td>
                          <td>—</td>
                          <td className="reports-text-right reports-mono" style={{ color: '#dc2626' }}>
                            {formatPHP(taxRows.reduce((sum, t) => sum + t.withholding_tax_amount, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 5. OVERTIME AND NIGHT DIFFERENTIAL REPORT */}
            {activeTab === 'overtime_night_diff' && (
              <div className="reports-table-card">
                <div className="reports-table-header-bar">
                  <div>
                    <h3 className="reports-table-title">Overtime & Night Shift Differential Audit</h3>
                    <span className="reports-table-subtitle">Labor Code Articles 86 & 87: 125% regular OT, 130% rest day/holiday, and 10% night diff</span>
                  </div>
                  <div className="reports-mono" style={{ fontWeight: 800, color: '#b45309', fontSize: '1.05rem' }}>
                    Total Premium: {formatPHP(otRows.reduce((sum, o) => sum + o.total_premium_pay, 0))}
                  </div>
                </div>

                <div className="reports-table-responsive">
                  <table className="reports-table">
                    <thead>
                      <tr>
                        <th>Employee Name</th>
                        <th>Employee No</th>
                        <th>Department</th>
                        <th className="reports-text-center">Reg OT (hrs)</th>
                        <th className="reports-text-right">Reg OT Pay</th>
                        <th className="reports-text-center">Rest Day (hrs)</th>
                        <th className="reports-text-right">Rest Day Pay</th>
                        <th className="reports-text-center">Holiday (hrs)</th>
                        <th className="reports-text-right">Holiday Pay</th>
                        <th className="reports-text-center">Night Diff (hrs)</th>
                        <th className="reports-text-right">Night Diff Pay</th>
                        <th className="reports-text-right">Total Premium Pay</th>
                      </tr>
                    </thead>
                    <tbody>
                      {otRows.map((o) => (
                        <tr key={o.employee_id}>
                          <td><strong>{o.employee_name}</strong></td>
                          <td>{o.employee_number}</td>
                          <td>{o.department}</td>
                          <td className="reports-text-center reports-mono">{o.regular_overtime_hours || 0}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(o.regular_overtime_pay)}</td>
                          <td className="reports-text-center reports-mono">{o.rest_day_hours || 0}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(o.rest_day_pay)}</td>
                          <td className="reports-text-center reports-mono">{o.holiday_hours || 0}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(o.holiday_pay)}</td>
                          <td className="reports-text-center reports-mono">{o.night_diff_hours || 0}</td>
                          <td className="reports-text-right reports-mono">{formatPHP(o.night_diff_pay)}</td>
                          <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: '#b45309' }}>
                            {formatPHP(o.total_premium_pay)}
                          </td>
                        </tr>
                      ))}
                      {otRows.length === 0 && (
                        <tr>
                          <td colSpan={12} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                            No overtime or night differential records found for this period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    {otRows.length > 0 && (
                      <tfoot>
                        <tr>
                          <td colSpan={3}>PREMIUM TOTALS</td>
                          <td className="reports-text-center reports-mono">
                            {otRows.reduce((sum, o) => sum + o.regular_overtime_hours, 0)} hrs
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(otRows.reduce((sum, o) => sum + o.regular_overtime_pay, 0))}
                          </td>
                          <td className="reports-text-center reports-mono">
                            {otRows.reduce((sum, o) => sum + o.rest_day_hours, 0)} hrs
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(otRows.reduce((sum, o) => sum + o.rest_day_pay, 0))}
                          </td>
                          <td className="reports-text-center reports-mono">
                            {otRows.reduce((sum, o) => sum + o.holiday_hours, 0)} hrs
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(otRows.reduce((sum, o) => sum + o.holiday_pay, 0))}
                          </td>
                          <td className="reports-text-center reports-mono">
                            {otRows.reduce((sum, o) => sum + o.night_diff_hours, 0)} hrs
                          </td>
                          <td className="reports-text-right reports-mono">
                            {formatPHP(otRows.reduce((sum, o) => sum + o.night_diff_pay, 0))}
                          </td>
                          <td className="reports-text-right reports-mono" style={{ color: '#b45309' }}>
                            {formatPHP(otRows.reduce((sum, o) => sum + o.total_premium_pay, 0))}
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            )}

            {/* 6. EMPLOYEE PAYROLL HISTORY REPORT */}
            {activeTab === 'employee_history' && (
              <div>
                {/* Employee Selector Bar */}
                <div style={{ background: '#ffffff', padding: '1rem', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-color)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }} className="reports-no-print">
                  <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--brand-dark-blue)' }}>
                    Select Employee:
                  </label>
                  <select
                    className="reports-filter-select"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    id="select-history-employee"
                    style={{ minWidth: '260px' }}
                  >
                    {employees.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.first_name} {e.last_name} ({e.employee_number})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="reports-table-card">
                  <div className="reports-table-header-bar">
                    <div>
                      <h3 className="reports-table-title">Individual Employee Historical Trajectory</h3>
                      <span className="reports-table-subtitle">
                        Chronological record of pay, attendance deductions, statutory withholdings, and net disbursements
                      </span>
                    </div>
                  </div>

                  <div className="reports-table-responsive">
                    <table className="reports-table">
                      <thead>
                        <tr>
                          <th>Period Name</th>
                          <th>Payout Date</th>
                          <th>Run No.</th>
                          <th className="reports-text-center">Days</th>
                          <th className="reports-text-right">Basic Pay</th>
                          <th className="reports-text-right">Overtime</th>
                          <th className="reports-text-right">Night Diff</th>
                          <th className="reports-text-right">Holiday</th>
                          <th className="reports-text-right">Allowances</th>
                          <th className="reports-text-right">Gross Pay</th>
                          <th className="reports-text-right">Att. Deduct</th>
                          <th className="reports-text-right">SSS</th>
                          <th className="reports-text-right">PhilHealth</th>
                          <th className="reports-text-right">Pag-IBIG</th>
                          <th className="reports-text-right">Withholding Tax</th>
                          <th className="reports-text-right">Total Deduct</th>
                          <th className="reports-text-right">Net Payout</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employeeHistoryRows.map((h, idx) => (
                          <tr key={`hist-${idx}`}>
                            <td><strong>{h.period_name}</strong></td>
                            <td>{h.payout_date}</td>
                            <td>{h.run_number}</td>
                            <td className="reports-text-center reports-mono">{h.days_worked}</td>
                            <td className="reports-text-right reports-mono">{formatPHP(h.basic_pay)}</td>
                            <td className="reports-text-right reports-mono">{formatPHP(h.overtime_pay)}</td>
                            <td className="reports-text-right reports-mono">{formatPHP(h.night_diff_pay)}</td>
                            <td className="reports-text-right reports-mono">{formatPHP(h.holiday_pay)}</td>
                            <td className="reports-text-right reports-mono">{formatPHP(h.allowances)}</td>
                            <td className="reports-text-right reports-mono" style={{ fontWeight: 700 }}>
                              {formatPHP(h.gross_pay)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#b91c1c' }}>
                              -{formatPHP(h.attendance_deductions)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#0369a1' }}>
                              -{formatPHP(h.sss_deduction)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#047857' }}>
                              -{formatPHP(h.philhealth_deduction)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#b45309' }}>
                              -{formatPHP(h.pagibig_deduction)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#dc2626' }}>
                              -{formatPHP(h.tax_deduction)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ color: '#b91c1c', fontWeight: 700 }}>
                              -{formatPHP(h.total_deductions)}
                            </td>
                            <td className="reports-text-right reports-mono" style={{ fontWeight: 800, color: 'var(--brand-dark-blue)' }}>
                              {formatPHP(h.net_pay)}
                            </td>
                          </tr>
                        ))}
                        {employeeHistoryRows.length === 0 && (
                          <tr>
                            <td colSpan={17} style={{ textAlign: 'center', padding: '2.5rem', color: 'var(--text-muted)' }}>
                              No historical payroll run records found for this employee.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
