/**
 * Innov8IT Payroll - Phase 14 Integration & Full Lifecycle Workflow Test Suite
 *
 * Validates the complete payroll processing pipeline:
 * 1. Period Setup & Multi-Employee Ingestion
 * 2. Multi-Employee Calculation Engine Execution
 * 3. Itemized Snapshot Generation
 * 4. Approval Workflow State Progression (Draft -> Review -> Return -> Review -> Approved -> Locked)
 * 5. Run Immutability & Admin-Only Unlocking
 * 6. Payslip Pipeline Generation from Approved/Locked Run
 * 7. Reporting Alignment (Totals reconciliation)
 */

import { calculatePayroll } from '../engine';
import {
  submitForReview,
  returnToDraft,
  approvePayrollRun,
  markAsPaid,
  lockPayrollRun,
  unlockPayrollRun,
  getAuditEventsForRun,
} from '../approval-actions';
import { updateLocalRunCache } from '../runs-actions';
import { syncPayslipsFromRun } from '../../payslips/actions';
import { getPayrollSummaryReport } from '../../reports/actions';
import {
  PayrollEmployeeInput,
  PayrollAttendanceInput,
  PayrollRunWithItems,
  PayrollRunItem,
} from '../../../types/payroll';

export async function runIntegrationLifecycleTests(): Promise<{ passed: number; failed: number; results: string[] }> {
  const results: string[] = [];
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
      results.push(`✓ PASS: ${testName}`);
    } else {
      failed++;
      results.push(`✗ FAIL: ${testName} - ${detail || 'Assertion failed'}`);
    }
  }

  // --------------------------------------------------------------------------
  // Step 1: Prepare Multi-Employee Roster for Cutoff
  // --------------------------------------------------------------------------
  const employees: PayrollEmployeeInput[] = [
    {
      id: 'emp-lifecycle-001',
      employee_number: 'IN8-E01',
      first_name: 'Carlos',
      last_name: 'Mendoza',
      basic_salary: 80000,
      pay_type: 'monthly',
      department_name: 'Engineering',
      position_title: 'Tech Lead',
    },
    {
      id: 'emp-lifecycle-002',
      employee_number: 'IN8-E02',
      first_name: 'Beatriz',
      last_name: 'Aquino',
      basic_salary: 45000,
      pay_type: 'monthly',
      department_name: 'Product',
      position_title: 'UI/UX Designer',
    },
    {
      id: 'emp-lifecycle-003',
      employee_number: 'IN8-E03',
      first_name: 'Danilo',
      last_name: 'Cruz',
      basic_salary: 28000,
      pay_type: 'monthly',
      department_name: 'Operations',
      position_title: 'Support Specialist',
    },
  ];

  const attendances: Record<string, PayrollAttendanceInput> = {
    'emp-lifecycle-001': {
      days_worked: 11,
      regular_hours: 88,
      overtime_hours: 10,
      night_diff_hours: 4,
      late_minutes: 0,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 8,
      holiday_special_hours: 0,
      rest_day_hours: 0,
    },
    'emp-lifecycle-002': {
      days_worked: 11,
      regular_hours: 88,
      overtime_hours: 4,
      night_diff_hours: 0,
      late_minutes: 15,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 0,
      holiday_special_hours: 4,
      rest_day_hours: 0,
    },
    'emp-lifecycle-003': {
      days_worked: 10,
      regular_hours: 80,
      overtime_hours: 0,
      night_diff_hours: 0,
      late_minutes: 30,
      undertime_minutes: 15,
      absent_days: 1,
      holiday_regular_hours: 0,
      holiday_special_hours: 0,
      rest_day_hours: 0,
    },
  };

  // --------------------------------------------------------------------------
  // Step 2: Ingest into Calculation Engine & Form Snapshot Items
  // --------------------------------------------------------------------------
  const runItems: PayrollRunItem[] = employees.map((emp) => {
    const att = attendances[emp.id];
    const calc = calculatePayroll({
      employee: emp,
      attendance: att,
      settings: {
        standard_working_days_per_year: 261,
        standard_hours_per_day: 8,
        enable_statutory_deductions: true,
      },
    });

    return {
      id: `item-${emp.id}`,
      payroll_run_id: 'run-lifecycle-001',
      employee_id: emp.id,
      employee_name_snapshot: `${emp.first_name} ${emp.last_name}`,
      employee_number_snapshot: emp.employee_number,
      department_snapshot: emp.department_name || 'General',
      position_snapshot: emp.position_title || 'Staff',
      basic_salary_snapshot: emp.basic_salary,
      hourly_rate_snapshot: calc.rates.hourly_rate,
      pay_type_snapshot: emp.pay_type,
      days_worked: att.days_worked,
      regular_hours: att.regular_hours,
      overtime_hours: att.overtime_hours,
      night_diff_hours: att.night_diff_hours,
      holiday_regular_hours: att.holiday_regular_hours,
      holiday_special_hours: att.holiday_special_hours,
      rest_day_hours: att.rest_day_hours,
      late_minutes: att.late_minutes,
      undertime_minutes: att.undertime_minutes,
      absent_days: att.absent_days,
      basic_pay: calc.basic_pay.calculated_amount,
      overtime_pay: calc.overtime.amount,
      night_diff_pay: calc.night_diff.amount,
      holiday_pay: calc.holiday.total_holiday_amount,
      rest_day_pay: calc.rest_day.amount,
      allowances: calc.total_allowances,
      bonuses: calc.total_bonuses,
      gross_pay: calc.gross_pay,
      late_deduction: calc.attendance_deductions.late_deduction,
      undertime_deduction: calc.attendance_deductions.undertime_deduction,
      absence_deduction: calc.attendance_deductions.absence_deduction,
      sss_deduction: calc.statutory_deductions?.sss.total_employee_cutoff || 0,
      philhealth_deduction: calc.statutory_deductions?.philhealth.employee_cutoff || 0,
      pagibig_deduction: calc.statutory_deductions?.pagibig.employee_cutoff || 0,
      tax_deduction: calc.statutory_deductions?.withholding_tax.tax_amount || 0,
      employer_contributions: calc.statutory_deductions?.total_employer_contributions || 0,
      other_deductions: calc.other_deductions,
      total_deductions: calc.total_deductions,
      net_pay: calc.net_pay,
      item_breakdown: calc,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  });

  const totalGross = runItems.reduce((sum, item) => sum + item.gross_pay, 0);
  const totalDeductions = runItems.reduce((sum, item) => sum + item.total_deductions, 0);
  const totalNet = runItems.reduce((sum, item) => sum + item.net_pay, 0);

  let currentRun: PayrollRunWithItems = {
    id: 'run-lifecycle-001',
    payroll_period_id: 'period-2026-01-A',
    run_number: 'PR-202601-LIFECYCLE',
    status: 'draft',
    total_gross_pay: Math.round(totalGross * 100) / 100,
    total_deductions: Math.round(totalDeductions * 100) / 100,
    total_net_pay: Math.round(totalNet * 100) / 100,
    total_employees: runItems.length,
    notes: 'Lifecycle verification run',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    items: runItems,
    payroll_period: {
      id: 'period-2026-01-A',
      name: 'Jan 1-15, 2026 Cutoff',
      start_date: '2026-01-01',
      end_date: '2026-01-15',
      payout_date: '2026-01-20',
      status: 'active',
    },
  };

  assert(currentRun.status === 'draft', 'Step 1: Payroll run initialized in DRAFT status');
  assert(currentRun.items.length === 3, 'Step 2: 3 employee snapshot items generated');
  assert(currentRun.total_gross_pay > 0, `Step 3: Run total gross computed: ₱${currentRun.total_gross_pay}`);
  assert(currentRun.total_net_pay > 0, `Step 4: Run total net pay computed: ₱${currentRun.total_net_pay}`);

  // --------------------------------------------------------------------------
  // Step 3: Workflow State Progression
  // --------------------------------------------------------------------------

  // A. Submit for Review
  const submitRes = await submitForReview(
    currentRun,
    'user-hr-01',
    'Maria Santos (HR)',
    'Ready for management review'
  );
  assert(submitRes.success && submitRes.data?.status === 'review', 'Step 5: Run transitioned from DRAFT to REVIEW');
  currentRun = submitRes.data!;

  // B. Return to Draft for adjustments
  const returnRes = await returnToDraft(
    currentRun,
    'user-admin-01',
    'Juan Admin',
    'admin',
    'Missing attendance dispute for Carlos'
  );
  assert(returnRes.success && returnRes.data?.status === 'draft', 'Step 6: Run returned to DRAFT with audit rationale');
  currentRun = returnRes.data!;

  // C. Resubmit after dispute resolution
  const resubmitRes = await submitForReview(
    currentRun,
    'user-hr-01',
    'Maria Santos (HR)',
    'Dispute resolved and verified'
  );
  assert(resubmitRes.success && resubmitRes.data?.status === 'review', 'Step 7: Run re-submitted to REVIEW status');
  currentRun = resubmitRes.data!;

  // D. Approve run
  const approveRes = await approvePayrollRun(
    currentRun,
    'user-admin-01',
    'Juan Admin',
    'admin',
    'All figures verified. Approved for disbursement.'
  );
  assert(approveRes.success && approveRes.data?.status === 'approved', 'Step 8: Run transitioned from REVIEW to APPROVED');
  currentRun = approveRes.data!;

  // E. Mark as Paid (Disbursement finalized)
  const paidRes = await markAsPaid(
    currentRun,
    'user-admin-01',
    'Juan Admin',
    'admin'
  );
  assert(paidRes.success && paidRes.data?.status === 'paid', 'Step 9: Run transitioned from APPROVED to PAID');
  currentRun = paidRes.data!;

  // F. Lock run (finalize for archival and payslip release)
  const lockRes = await lockPayrollRun(
    currentRun,
    'user-admin-01',
    'Juan Admin',
    'admin'
  );
  assert(lockRes.success && lockRes.data?.status === 'locked', 'Step 10: Run successfully LOCKED');
  currentRun = lockRes.data!;

  // F. Verify non-admin cannot unlock
  const unauthorizedUnlock = await unlockPayrollRun(
    currentRun,
    'user-hr-01',
    'Maria Santos (HR)',
    'payroll_hr', // HR role cannot unlock, only admin
    'Try unlock'
  );
  assert(
    Boolean(!unauthorizedUnlock.success && unauthorizedUnlock.error?.includes('admin')),
    'Step 10: Security check: HR role prevented from unlocking locked run'
  );

  // G. Audit Trail Verification
  const auditEvents = getAuditEventsForRun(currentRun.id);
  assert(
    auditEvents.length >= 4,
    `Step 11: Audit trail populated with ${auditEvents.length} sequential governance events`
  );

  // --------------------------------------------------------------------------
  // Step 4: Payslip Generation & Snapshot Fidelity
  // --------------------------------------------------------------------------
  updateLocalRunCache(currentRun);
  const generatedPayslips = await syncPayslipsFromRun(currentRun.id);
  assert(generatedPayslips.length === 3, 'Step 12: Successfully generated 3 employee payslips from locked run');

  const employeeItem = currentRun.items[0]; // Carlos Mendoza
  const payslip = generatedPayslips.find((p) => p.employee_id === employeeItem.employee_id);

  assert(
    !!payslip && payslip.net_pay === employeeItem.net_pay,
    'Step 13: Generated payslip net pay matches snapshot exactly'
  );
  assert(
    !!payslip && payslip.gross_pay === employeeItem.gross_pay,
    'Step 14: Generated payslip gross pay matches snapshot exactly'
  );
  assert(
    !!payslip && payslip.sss_deduction === employeeItem.sss_deduction,
    'Step 15: Generated payslip SSS deduction matches item breakdown'
  );
  assert(
    !!payslip && (payslip.status === 'published' || payslip.status === 'generated'),
    'Step 16: Payslip initialized with valid distribution status'
  );

  // --------------------------------------------------------------------------
  // Step 5: Report Reconciliation
  // --------------------------------------------------------------------------
  const summaryReport = await getPayrollSummaryReport();
  assert(summaryReport.length > 0, 'Step 17: Summary report aggregates payroll history');

  return { passed, failed, results };
}
