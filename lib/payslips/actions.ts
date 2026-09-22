import { createClient } from '@/lib/supabase/client';
import {
  Payslip,
  PayslipFilters,
  PayslipAccessUser,
  PayslipStatus,
} from '@/types/payslip';
import { getPayrollRuns, getPayrollRunById } from '@/lib/payroll/runs-actions';
import { getItemizedDeductions } from '@/lib/payroll/item-deductions';
import { fallbackPayrollRuns } from '@/lib/payroll/mock-runs';

/**
 * Seed / Mock Payslips for demonstration, development, and offline mode
 */
export const SEED_PAYSLIPS: Payslip[] = (fallbackPayrollRuns[0]?.items || []).map((item, index) => {
  const run = fallbackPayrollRuns[0];
  const period = run.payroll_period!;
  const itemDed = getItemizedDeductions(item);

  return {
    id: `ps-seed-${(index + 1).toString().padStart(3, '0')}`,
    payroll_run_id: run.id,
    payroll_run_item_id: item.id,
    employee_id: item.employee_id,
    payslip_number: `PS-202609-01-${(index + 1).toString().padStart(3, '0')}`,
    status: 'published',
    issue_date: '2026-09-15',
    viewed_at: null,
    notes: 'Approved semi-monthly payroll distribution',
    created_at: '2026-09-15T08:30:00.000Z',
    updated_at: '2026-09-15T08:30:00.000Z',

    employee_name: item.employee_name_snapshot,
    employee_number: item.employee_number_snapshot,
    employee_email: `${item.employee_name_snapshot.toLowerCase().replace(/ /g, '.')}@innov8it.ph`,
    department: item.department_snapshot,
    position: item.position_snapshot,
    pay_type: item.pay_type_snapshot,
    basic_salary: item.basic_salary_snapshot,
    hourly_rate: item.hourly_rate_snapshot,

    period_id: period.id,
    period_name: period.name,
    period_start: period.start_date,
    period_end: period.end_date,
    payout_date: period.payout_date,
    run_number: run.run_number,

    days_worked: item.days_worked,
    regular_hours: item.regular_hours,
    overtime_hours: item.overtime_hours,
    night_diff_hours: item.night_diff_hours,
    holiday_regular_hours: item.holiday_regular_hours,
    holiday_special_hours: item.holiday_special_hours,
    rest_day_hours: item.rest_day_hours,
    late_minutes: item.late_minutes,
    undertime_minutes: item.undertime_minutes,
    absent_days: item.absent_days,

    basic_pay: item.basic_pay,
    overtime_pay: item.overtime_pay,
    night_diff_pay: item.night_diff_pay,
    holiday_pay: item.holiday_pay,
    rest_day_pay: item.rest_day_pay,
    allowances: item.allowances,
    bonuses: item.bonuses,
    other_earnings: 0,
    gross_pay: item.gross_pay,

    late_deduction: itemDed.late.amount,
    undertime_deduction: itemDed.undertime.amount,
    absence_deduction: itemDed.absence.amount,
    sss_deduction: itemDed.sss.amount,
    philhealth_deduction: itemDed.philhealth.amount,
    pagibig_deduction: itemDed.pagibig.amount,
    tax_deduction: itemDed.tax.amount,
    other_deductions: itemDed.other.amount,
    other_deductions_list: itemDed.other.list,
    total_deductions: itemDed.totalDeductions,

    net_pay: item.net_pay,
  };
});

// Local in-memory cache for payslips
let localPayslipsCache: Payslip[] = [...SEED_PAYSLIPS];

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem('innov8it_payslips_cache');
    if (stored) {
      localPayslipsCache = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse payslips cache from localStorage', e);
  }
}

function persistPayslipsCache() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('innov8it_payslips_cache', JSON.stringify(localPayslipsCache));
  }
}

/**
 * Sync / generate payslips from a completed or approved payroll run
 */
export async function syncPayslipsFromRun(runId: string): Promise<Payslip[]> {
  const run = await getPayrollRunById(runId);
  if (!run || !run.items || run.items.length === 0) {
    return [];
  }

  const generated: Payslip[] = run.items.map((item, index) => {
    const payslipNum = `PS-${run.run_number.replace('PR-', '')}-${(index + 1).toString().padStart(3, '0')}`;
    const itemDed = getItemizedDeductions(item);

    const existing = localPayslipsCache.find((p) => p.payroll_run_item_id === item.id);
    if (existing) {
      existing.late_deduction = itemDed.late.amount;
      existing.undertime_deduction = itemDed.undertime.amount;
      existing.absence_deduction = itemDed.absence.amount;
      existing.sss_deduction = itemDed.sss.amount;
      existing.philhealth_deduction = itemDed.philhealth.amount;
      existing.pagibig_deduction = itemDed.pagibig.amount;
      existing.tax_deduction = itemDed.tax.amount;
      existing.other_deductions = itemDed.other.amount;
      existing.other_deductions_list = itemDed.other.list;
      existing.total_deductions = itemDed.totalDeductions;
      existing.item_breakdown = item.item_breakdown || existing.item_breakdown;
      persistPayslipsCache();
      return existing;
    }

    const newPayslip: Payslip = {
      id: `ps-${item.id}`,
      payroll_run_id: run.id,
      payroll_run_item_id: item.id,
      employee_id: item.employee_id,
      payslip_number: payslipNum,
      status: run.status === 'paid' || run.status === 'approved' || run.status === 'locked' ? 'published' : 'generated',
      issue_date: run.payroll_period?.payout_date || new Date().toISOString().split('T')[0],
      viewed_at: null,
      notes: run.notes || 'Payroll Run item generated payslip.',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),

      employee_name: item.employee_name_snapshot,
      employee_number: item.employee_number_snapshot,
      department: item.department_snapshot,
      position: item.position_snapshot,
      pay_type: item.pay_type_snapshot,
      basic_salary: Number(item.basic_salary_snapshot),
      hourly_rate: Number(item.hourly_rate_snapshot),

      period_id: run.payroll_period_id,
      period_name: run.payroll_period?.name || 'Current Period',
      period_start: run.payroll_period?.start_date || '',
      period_end: run.payroll_period?.end_date || '',
      payout_date: run.payroll_period?.payout_date || '',
      run_number: run.run_number,

      days_worked: Number(item.days_worked),
      regular_hours: Number(item.regular_hours),
      overtime_hours: Number(item.overtime_hours),
      night_diff_hours: Number(item.night_diff_hours),
      holiday_regular_hours: Number(item.holiday_regular_hours),
      holiday_special_hours: Number(item.holiday_special_hours),
      rest_day_hours: Number(item.rest_day_hours),
      late_minutes: Number(item.late_minutes),
      undertime_minutes: Number(item.undertime_minutes),
      absent_days: Number(item.absent_days),

      basic_pay: Number(item.basic_pay),
      overtime_pay: Number(item.overtime_pay),
      night_diff_pay: Number(item.night_diff_pay),
      holiday_pay: Number(item.holiday_pay),
      rest_day_pay: Number(item.rest_day_pay),
      allowances: Number(item.allowances),
      allowances_list: item.item_breakdown?.allowances_list || [],
      bonuses: Number(item.bonuses),
      bonuses_list: item.item_breakdown?.bonuses_list || [],
      other_earnings: 0,
      gross_pay: Number(item.gross_pay),

      late_deduction: itemDed.late.amount,
      undertime_deduction: itemDed.undertime.amount,
      absence_deduction: itemDed.absence.amount,
      sss_deduction: itemDed.sss.amount,
      philhealth_deduction: itemDed.philhealth.amount,
      pagibig_deduction: itemDed.pagibig.amount,
      tax_deduction: itemDed.tax.amount,
      other_deductions: itemDed.other.amount,
      other_deductions_list: itemDed.other.list,
      total_deductions: itemDed.totalDeductions,

      net_pay: Number(item.net_pay),
      item_breakdown: item.item_breakdown,
    };

    localPayslipsCache.push(newPayslip);
    persistPayslipsCache();
    return newPayslip;
  });

  return generated;
}

/**
 * Fetch all payslips based on filters and caller authorization
 * Enforces Phase 10 security requirement: Employees can only view their own payslips.
 */
export async function getPayslips(
  filters?: PayslipFilters,
  currentUser?: PayslipAccessUser
): Promise<Payslip[]> {
  try {
    const supabase = createClient();
    let query: any = (supabase.from('payslips') as any)
      .select(`
        *,
        employee:employees(email, first_name, last_name, employee_number, department:departments(name), position:positions(title)),
        payroll_run:payroll_runs(run_number, status, payroll_period:payroll_periods(*)),
        payroll_run_item:payroll_run_items(*)
      `)
      .order('issue_date', { ascending: false });

    if (currentUser && currentUser.role === 'employee') {
      if (currentUser.employeeId) {
        query = query.eq('employee_id', currentUser.employeeId);
      }
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      // Fallback to local cache with permission enforcement
      return filterLocalPayslips(localPayslipsCache, filters, currentUser);
    }

    // Map Supabase rows to typed Payslip objects
    const mapped: Payslip[] = data.map((row: any) => {
      const item = row.payroll_run_item || {};
      const run = row.payroll_run || {};
      const period = run.payroll_period || {};
      const emp = row.employee || {};

      return {
        id: row.id,
        payroll_run_id: row.payroll_run_id,
        payroll_run_item_id: row.payroll_run_item_id,
        employee_id: row.employee_id,
        payslip_number: row.payslip_number,
        status: row.status,
        issue_date: row.issue_date,
        viewed_at: row.viewed_at,
        notes: row.notes,
        created_at: row.created_at,
        updated_at: row.updated_at,

        employee_name: item.employee_name_snapshot || `${emp.first_name || ''} ${emp.last_name || ''}`.trim(),
        employee_number: item.employee_number_snapshot || emp.employee_number || '',
        employee_email: emp.email,
        department: item.department_snapshot || emp.department?.name || null,
        position: item.position_snapshot || emp.position?.title || null,
        pay_type: item.pay_type_snapshot || 'monthly',
        basic_salary: Number(item.basic_salary_snapshot || 0),
        hourly_rate: Number(item.hourly_rate_snapshot || 0),

        period_id: period.id,
        period_name: period.name || 'Cutoff Period',
        period_start: period.start_date || '',
        period_end: period.end_date || '',
        payout_date: period.payout_date || row.issue_date,
        run_number: run.run_number || '',

        days_worked: Number(item.days_worked || 0),
        regular_hours: Number(item.regular_hours || 0),
        overtime_hours: Number(item.overtime_hours || 0),
        night_diff_hours: Number(item.night_diff_hours || 0),
        holiday_regular_hours: Number(item.holiday_regular_hours || 0),
        holiday_special_hours: Number(item.holiday_special_hours || 0),
        rest_day_hours: Number(item.rest_day_hours || 0),
        late_minutes: Number(item.late_minutes || 0),
        undertime_minutes: Number(item.undertime_minutes || 0),
        absent_days: Number(item.absent_days || 0),

        basic_pay: Number(item.basic_pay || 0),
        overtime_pay: Number(item.overtime_pay || 0),
        night_diff_pay: Number(item.night_diff_pay || 0),
        holiday_pay: Number(item.holiday_pay || 0),
        rest_day_pay: Number(item.rest_day_pay || 0),
        allowances: Number(item.allowances || 0),
        allowances_list: item.item_breakdown?.allowances_list || [],
        bonuses: Number(item.bonuses || 0),
        bonuses_list: item.item_breakdown?.bonuses_list || [],
        other_earnings: 0,
        gross_pay: Number(item.gross_pay || 0),

        ...(() => {
          const itemDed = getItemizedDeductions({
            ...item,
            basic_salary: item.basic_salary_snapshot || emp.basic_salary || 0,
            pay_type: item.pay_type_snapshot || emp.pay_type || 'monthly',
          });
          return {
            late_deduction: itemDed.late.amount,
            undertime_deduction: itemDed.undertime.amount,
            absence_deduction: itemDed.absence.amount,
            sss_deduction: itemDed.sss.amount,
            philhealth_deduction: itemDed.philhealth.amount,
            pagibig_deduction: itemDed.pagibig.amount,
            tax_deduction: itemDed.tax.amount,
            other_deductions: itemDed.other.amount,
            other_deductions_list: itemDed.other.list,
            total_deductions: itemDed.totalDeductions,
          };
        })(),

        net_pay: Number(item.net_pay || 0),
        item_breakdown: item.item_breakdown,
      };
    });

    return filterLocalPayslips(mapped, filters, currentUser);
  } catch {
    return filterLocalPayslips(localPayslipsCache, filters, currentUser);
  }
}

/**
 * Filter helper for local cache / in-memory items
 */
function filterLocalPayslips(
  items: Payslip[],
  filters?: PayslipFilters,
  currentUser?: PayslipAccessUser
): Payslip[] {
  let list = [...items];

  // Employee-specific permission enforcement
  if (currentUser && currentUser.role === 'employee') {
    list = list.filter((p) => {
      if (currentUser.employeeId && p.employee_id === currentUser.employeeId) return true;
      if (currentUser.email && p.employee_email?.toLowerCase() === currentUser.email.toLowerCase()) return true;
      return false;
    });
  }

  if (filters?.employeeId) {
    list = list.filter((p) => p.employee_id === filters.employeeId);
  }

  if (filters?.periodId) {
    list = list.filter((p) => p.period_id === filters.periodId);
  }

  if (filters?.status && filters.status !== 'all') {
    list = list.filter((p) => p.status === filters.status);
  }

  if (filters?.search) {
    const q = filters.search.toLowerCase();
    list = list.filter(
      (p) =>
        p.employee_name.toLowerCase().includes(q) ||
        p.employee_number.toLowerCase().includes(q) ||
        p.payslip_number.toLowerCase().includes(q) ||
        (p.department && p.department.toLowerCase().includes(q))
    );
  }

  return list;
}

/**
 * Fetch a single payslip with strict role authorization
 */
export async function getPayslipById(
  id: string,
  currentUser?: PayslipAccessUser
): Promise<{ success: boolean; data?: Payslip; error?: string; unauthorized?: boolean }> {
  // First search in local cache or fallback list
  let payslip = localPayslipsCache.find((p) => p.id === id || p.payslip_number === id);

  if (!payslip) {
    try {
      const all = await getPayslips(undefined, undefined);
      payslip = all.find((p) => p.id === id || p.payslip_number === id);
    } catch {}
  }

  // Fallback: If not found and ID begins with ps-, find matching item from payroll runs
  if (!payslip && id.startsWith('ps-')) {
    const targetItemId = id.replace('ps-', '');
    try {
      const runs = await getPayrollRuns();
      for (const r of runs) {
        const fullRun = await getPayrollRunById(r.id);
        const itemMatch = fullRun?.items?.find((it) => it.id === targetItemId || `ps-${it.id}` === id);
        if (itemMatch && fullRun) {
          const generated = await syncPayslipsFromRun(fullRun.id);
          payslip = generated.find((p) => p.id === id || p.payroll_run_item_id === itemMatch.id);
          if (payslip) break;
        }
      }
    } catch {}
  }

  if (!payslip) {
    return { success: false, error: 'Payslip not found.' };
  }

  // Ensure statutory mandatory benefit deductions are cleanly itemized
  const itemDed = getItemizedDeductions(payslip);
  payslip.late_deduction = itemDed.late.amount;
  payslip.undertime_deduction = itemDed.undertime.amount;
  payslip.absence_deduction = itemDed.absence.amount;
  payslip.sss_deduction = itemDed.sss.amount;
  payslip.philhealth_deduction = itemDed.philhealth.amount;
  payslip.pagibig_deduction = itemDed.pagibig.amount;
  payslip.tax_deduction = itemDed.tax.amount;
  payslip.other_deductions = itemDed.other.amount;
  payslip.other_deductions_list = itemDed.other.list;
  payslip.total_deductions = itemDed.totalDeductions;

  // Strict Confidentiality Enforcement:
  // An employee may ONLY view their own payslip.
  if (currentUser && currentUser.role === 'employee') {
    const isOwner =
      (currentUser.employeeId && payslip.employee_id === currentUser.employeeId) ||
      (currentUser.email && payslip.employee_email?.toLowerCase() === currentUser.email.toLowerCase());

    if (!isOwner) {
      return {
        success: false,
        unauthorized: true,
        error: `Confidential Document: You do not have permission to view ${payslip.employee_name}'s payslip.`,
      };
    }
  }

  return { success: true, data: payslip };
}

/**
 * Mark a payslip as viewed by employee
 */
export async function markPayslipAsViewed(
  id: string,
  currentUser?: PayslipAccessUser
): Promise<boolean> {
  const payslip = localPayslipsCache.find((p) => p.id === id);
  if (payslip && !payslip.viewed_at) {
    payslip.viewed_at = new Date().toISOString();
    payslip.status = 'viewed';
    payslip.updated_at = new Date().toISOString();
    persistPayslipsCache();
  }

  try {
    const supabase = createClient();
    await (supabase.from('payslips') as any)
      .update({
        status: 'viewed',
        viewed_at: new Date().toISOString(),
      })
      .eq('id', id);
  } catch {}

  return true;
}

/**
 * Publish all payslips for a given run
 */
export async function publishPayslips(runId: string): Promise<boolean> {
  localPayslipsCache.forEach((p) => {
    if (p.payroll_run_id === runId && p.status === 'generated') {
      p.status = 'published';
      p.updated_at = new Date().toISOString();
    }
  });
  persistPayslipsCache();

  try {
    const supabase = createClient();
    await (supabase.from('payslips') as any)
      .update({ status: 'published' })
      .eq('payroll_run_id', runId);
  } catch {}

  return true;
}
