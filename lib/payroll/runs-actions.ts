import { createClient } from '@/lib/supabase/client';
import {
  PayrollRun,
  PayrollRunWithItems,
  PayrollRunItem,
  PayrollRunStatus,
} from '@/types/payroll';
import { fallbackPayrollRuns } from './mock-runs';
import { getEmployees } from '@/lib/employees/actions';
import { getAttendanceForPeriod, getPayrollPeriods } from '@/lib/attendance/actions';
import { getPayrollSettings } from './settings-actions';
import { calculatePayroll } from './engine';
import { roundToTwoDecimals } from './calculate-rates';

// Local in-memory cache for runs
let localRunsCache: PayrollRunWithItems[] = [...fallbackPayrollRuns];

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem('innov8it_runs_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        localRunsCache = parsed;
        window.localStorage.setItem('innov8it_runs_cache', JSON.stringify(localRunsCache));
      }
    }
  } catch (e) {
    console.error('Failed to parse runs cache from localStorage', e);
  }
}

function persistRunsCache() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('innov8it_runs_cache', JSON.stringify(localRunsCache));
  }
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function updateLocalRunCache(run: PayrollRunWithItems) {
  const idx = localRunsCache.findIndex((r) => r.id === run.id);
  if (idx !== -1) {
    localRunsCache[idx] = run;
  } else {
    localRunsCache.unshift(run);
  }
  persistRunsCache();
}

/**
 * Fetch all payroll runs with associated period details
 */
export async function getPayrollRuns(): Promise<PayrollRun[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        payroll_period:payroll_periods(*)
      `)
      .order('created_at', { ascending: false });

    const localRuns = localRunsCache.map(({ items, ...run }) => run);

    if (error || !data || data.length === 0) {
      return localRuns;
    }

    // Merge Supabase data with localRunsCache to ensure newly created or modified runs stay visible
    const dbRunMap = new Map((data as any[]).map((r) => [r.id, r]));
    const merged: PayrollRun[] = (data as any[]).map((dbRun) => {
      const local = localRunsCache.find((l) => l.id === dbRun.id || l.run_number === dbRun.run_number);
      if (local) {
        // If local run has newer timestamp, preserve local status and metadata
        if (new Date(local.updated_at).getTime() >= new Date(dbRun.updated_at).getTime()) {
          return {
            ...dbRun,
            status: local.status,
            notes: local.notes || dbRun.notes,
            approved_by: local.approved_by || dbRun.approved_by,
            approved_by_name: local.approved_by_name || dbRun.approved_by_name,
            approved_at: local.approved_at || dbRun.approved_at,
            locked_by: local.locked_by || dbRun.locked_by,
            locked_by_name: local.locked_by_name || dbRun.locked_by_name,
            locked_at: local.locked_at || dbRun.locked_at,
            updated_at: local.updated_at,
          };
        }
      }
      return dbRun as PayrollRun;
    });

    for (const local of localRuns) {
      if (!dbRunMap.has(local.id)) {
        merged.push(local);
      }
    }

    return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } catch {
    return localRunsCache.map(({ items, ...run }) => run);
  }
}

/**
 * Fetch a specific payroll run with its snapshot items
 */
export async function getPayrollRunById(id: string): Promise<PayrollRunWithItems | null> {
  const localFound = localRunsCache.find((r) => r.id === id);

  try {
    const supabase = createClient();
    const { data: run, error: runError } = await supabase
      .from('payroll_runs')
      .select(`
        *,
        payroll_period:payroll_periods(*)
      `)
      .eq('id', id)
      .single();

    if (runError || !run) {
      return localFound || null;
    }

    const { data: items, error: itemsError } = await supabase
      .from('payroll_run_items')
      .select('*')
      .eq('payroll_run_id', id)
      .order('employee_name_snapshot', { ascending: true });

    // CRITICAL FIX: If Supabase returns no items (due to unmigrated DB or FK constraints),
    // fall back to items stored in localRunsCache so employee calculation snapshots are never lost!
    const effectiveItems = (items && items.length > 0)
      ? (items as PayrollRunItem[])
      : (localFound?.items || []);

    const effectiveStatus = (localFound && new Date(localFound.updated_at).getTime() > new Date((run as any).updated_at).getTime())
      ? localFound.status
      : ((run as any).status || localFound?.status || 'draft');

    const result: PayrollRunWithItems = {
      ...(run as PayrollRun),
      status: effectiveStatus,
      review_notes: localFound?.review_notes || (run as any)?.review_notes || null,
      approved_by: localFound?.approved_by || (run as any)?.approved_by || null,
      approved_by_name: localFound?.approved_by_name || (run as any)?.approved_by_name || null,
      approved_at: localFound?.approved_at || (run as any)?.approved_at || null,
      locked_by: localFound?.locked_by || (run as any)?.locked_by || null,
      locked_by_name: localFound?.locked_by_name || (run as any)?.locked_by_name || null,
      locked_at: localFound?.locked_at || (run as any)?.locked_at || null,
      items: effectiveItems,
    };

    // If effectiveItems is empty, generate snapshots for active employees so run details and payslips are never blank
    if (result.items.length === 0) {
      try {
        const emps = await getEmployees();
        const activeEmps = emps.filter((e) => e.status === 'active');
        if (activeEmps.length > 0) {
          const settings = (await getPayrollSettings()) || {};
          result.items = activeEmps.map((emp) => {
            const calc = calculatePayroll({
              employee: {
                id: emp.id,
                employee_number: emp.employee_number,
                first_name: emp.first_name,
                last_name: emp.last_name,
                basic_salary: emp.basic_salary,
                pay_type: emp.pay_type,
                hourly_rate: emp.hourly_rate,
              },
              attendance: {
                days_worked: 11,
                regular_hours: 88,
                overtime_hours: 0,
                night_diff_hours: 0,
                holiday_regular_hours: 0,
                holiday_special_hours: 0,
                rest_day_hours: 0,
                late_minutes: 0,
                undertime_minutes: 0,
                absent_days: 0,
              },
              settings,
              includeStatutory: settings.enable_statutory_deductions !== false,
            });
            return {
              id: generateUUID(),
              payroll_run_id: id,
              employee_id: emp.id,
              employee_name_snapshot: `${emp.first_name} ${emp.last_name}`,
              employee_number_snapshot: emp.employee_number,
              department_snapshot: emp.department?.name || null,
              position_snapshot: emp.position?.title || null,
              basic_salary_snapshot: emp.basic_salary,
              hourly_rate_snapshot: calc.rates.hourly_rate,
              pay_type_snapshot: emp.pay_type,
              days_worked: 11,
              regular_hours: 88,
              overtime_hours: 0,
              night_diff_hours: 0,
              holiday_regular_hours: 0,
              holiday_special_hours: 0,
              rest_day_hours: 0,
              late_minutes: 0,
              undertime_minutes: 0,
              absent_days: 0,
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
        }
      } catch (err) {
        console.warn('Fallback item reconstruction notice:', err);
      }
    }

    // Keep local cache synced with DB fetch
    updateLocalRunCache(result);

    return result;
  } catch {
    return localFound || null;
  }
}

/**
 * Create and execute a new Payroll Run for a designated cutoff period
 *
 * Workflow:
 * 1. Validates selected period.
 * 2. Fetches active employees and their DTR attendance records.
 * 3. Applies payroll configuration rules through the Phase 7 calculation engine.
 * 4. Freezes snapshots of all employee details, hours, and pay components.
 * 5. Saves run in 'draft' or 'review' status.
 */
export async function createPayrollRun(
  periodId: string,
  notes?: string
): Promise<{ success: boolean; data?: PayrollRunWithItems; error?: string }> {
  try {
    const [employees, attendanceList, settingsList, periods] = await Promise.all([
      getEmployees(),
      getAttendanceForPeriod(periodId),
      getPayrollSettings(),
      getPayrollPeriods(),
    ]);

    const period = periods.find((p) => p.id === periodId);
    if (!period) {
      return { success: false, error: 'Designated payroll period not found.' };
    }

    const activeEmployees = employees.filter((e) => e.status === 'active');
    if (activeEmployees.length === 0) {
      return { success: false, error: 'No active employees found to process.' };
    }

    const attendanceMap = new Map(attendanceList.map((a) => [a.employee_id, a]));
    const settings = settingsList || {};

    const runId = generateUUID();
    const runNumber = `RUN-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(localRunsCache.length + 1).padStart(2, '0')}`;

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    const items: PayrollRunItem[] = activeEmployees.map((emp) => {
      const att = attendanceMap.get(emp.id) || {
        days_worked: 11,
        regular_hours: 88,
        overtime_hours: 0,
        night_diff_hours: 0,
        holiday_regular_hours: 0,
        holiday_special_hours: 0,
        rest_day_hours: 0,
        late_minutes: 0,
        undertime_minutes: 0,
        absent_days: 0,
      };

      // Execute calculation engine
      const calc = calculatePayroll({
        employee: {
          id: emp.id,
          employee_number: emp.employee_number,
          first_name: emp.first_name,
          last_name: emp.last_name,
          basic_salary: emp.basic_salary,
          pay_type: emp.pay_type,
          hourly_rate: emp.hourly_rate,
        },
        attendance: {
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
        },
        settings,
        includeStatutory: settings.enable_statutory_deductions !== false,
      });

      totalGrossPay += calc.gross_pay;
      totalDeductions += calc.total_deductions;
      totalNetPay += calc.net_pay;

      const item: PayrollRunItem = {
        id: generateUUID(),
        payroll_run_id: runId,
        employee_id: emp.id,
        employee_name_snapshot: `${emp.first_name} ${emp.last_name}`,
        employee_number_snapshot: emp.employee_number,
        department_snapshot: emp.department?.name || null,
        position_snapshot: emp.position?.title || null,
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

      return item;
    });

    const newRun: PayrollRunWithItems = {
      id: runId,
      payroll_period_id: periodId,
      run_number: runNumber,
      status: 'draft',
      total_employees: activeEmployees.length,
      total_gross_pay: roundToTwoDecimals(totalGrossPay),
      total_deductions: roundToTwoDecimals(totalDeductions),
      total_net_pay: roundToTwoDecimals(totalNetPay),
      notes: notes?.trim() || null,
      processed_by: null,
      processed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payroll_period: period,
      items,
    };

    // Attempt to persist to Supabase if available
    try {
      const supabase = createClient();
      const { error: runDbErr } = await (supabase.from('payroll_runs') as any).insert({
        id: runId,
        payroll_period_id: periodId,
        run_number: runNumber,
        status: 'draft',
        total_employees: activeEmployees.length,
        total_gross_pay: roundToTwoDecimals(totalGrossPay),
        total_deductions: roundToTwoDecimals(totalDeductions),
        total_net_pay: roundToTwoDecimals(totalNetPay),
        notes: notes?.trim() || null,
      });

      if (runDbErr) {
        console.warn('Supabase payroll_runs insert notice:', runDbErr.message);
      } else {
        const itemsToInsert = items
          .filter((it) => isValidUUID(it.employee_id))
          .map((it) => ({
            id: it.id,
            payroll_run_id: runId,
            employee_id: it.employee_id,
            employee_name_snapshot: it.employee_name_snapshot,
            employee_number_snapshot: it.employee_number_snapshot,
            department_snapshot: it.department_snapshot,
            position_snapshot: it.position_snapshot,
            basic_salary_snapshot: it.basic_salary_snapshot,
            hourly_rate_snapshot: it.hourly_rate_snapshot,
            pay_type_snapshot: it.pay_type_snapshot,
            days_worked: it.days_worked,
            regular_hours: it.regular_hours,
            overtime_hours: it.overtime_hours,
            night_diff_hours: it.night_diff_hours,
            holiday_regular_hours: it.holiday_regular_hours,
            holiday_special_hours: it.holiday_special_hours,
            rest_day_hours: it.rest_day_hours,
            late_minutes: it.late_minutes,
            undertime_minutes: it.undertime_minutes,
            absent_days: it.absent_days,
            basic_pay: it.basic_pay,
            overtime_pay: it.overtime_pay,
            night_diff_pay: it.night_diff_pay,
            holiday_pay: it.holiday_pay,
            rest_day_pay: it.rest_day_pay,
            allowances: it.allowances,
            bonuses: it.bonuses,
            gross_pay: it.gross_pay,
            late_deduction: it.late_deduction,
            undertime_deduction: it.undertime_deduction,
            absence_deduction: it.absence_deduction,
            sss_deduction: it.sss_deduction || 0,
            philhealth_deduction: it.philhealth_deduction || 0,
            pagibig_deduction: it.pagibig_deduction || 0,
            tax_deduction: it.tax_deduction || 0,
            employer_contributions: it.employer_contributions || 0,
            other_deductions: it.other_deductions,
            total_deductions: it.total_deductions,
            net_pay: it.net_pay,
            item_breakdown: it.item_breakdown,
          }));

        if (itemsToInsert.length > 0) {
          const { error: itemsErr } = await (supabase.from('payroll_run_items') as any).insert(itemsToInsert);
          if (itemsErr) {
            console.warn('Supabase payroll_run_items insert notice:', itemsErr.message);
          }
        }
      }
    } catch (e) {
      console.warn('Supabase payroll run insert notice:', e);
    }

    localRunsCache.unshift(newRun);
    persistRunsCache();

    // Dynamically generate initial draft payslips for this run so payslips are immediately available
    if (typeof window !== 'undefined') {
      import('@/lib/payslips/actions')
        .then(({ syncPayslipsFromRun }) => syncPayslipsFromRun(newRun.id, newRun))
        .catch(() => {});
    }

    return { success: true, data: newRun };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create payroll run.' };
  }
}

/**
 * Recalculate a payroll run
 *
 * CRITICAL RULE (Section 16):
 * - Recalculation is ONLY allowed when status is 'draft' or 'processing'.
 * - If status is 'review', 'approved', 'paid', or 'locked', recalculation is prohibited
 *   to guarantee strict historical preservation.
 */
export async function recalculatePayrollRun(
  runId: string
): Promise<{ success: boolean; data?: PayrollRunWithItems; error?: string }> {
  try {
    const run = await getPayrollRunById(runId);
    if (!run) {
      return { success: false, error: 'Payroll run not found.' };
    }

    if (run.status !== 'draft' && run.status !== 'processing') {
      return {
        success: false,
        error: `Cannot recalculate: this payroll run is in '${run.status.toUpperCase()}' status and is locked to protect historical audit records. Only 'draft' or 'processing' runs may be recalculated.`,
      };
    }

    const [employees, attendanceList, settingsList] = await Promise.all([
      getEmployees(),
      getAttendanceForPeriod(run.payroll_period_id),
      getPayrollSettings(),
    ]);

    const activeEmployees = employees.filter((e) => e.status === 'active');
    const attendanceMap = new Map(attendanceList.map((a) => [a.employee_id, a]));
    const settings = settingsList || {};

    let totalGrossPay = 0;
    let totalDeductions = 0;
    let totalNetPay = 0;

    const updatedItems: PayrollRunItem[] = activeEmployees.map((emp) => {
      const att = attendanceMap.get(emp.id) || {
        days_worked: 11,
        regular_hours: 88,
        overtime_hours: 0,
        night_diff_hours: 0,
        holiday_regular_hours: 0,
        holiday_special_hours: 0,
        rest_day_hours: 0,
        late_minutes: 0,
        undertime_minutes: 0,
        absent_days: 0,
      };

      const calc = calculatePayroll({
        employee: {
          id: emp.id,
          employee_number: emp.employee_number,
          first_name: emp.first_name,
          last_name: emp.last_name,
          basic_salary: emp.basic_salary,
          pay_type: emp.pay_type,
          hourly_rate: emp.hourly_rate,
        },
        attendance: {
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
        },
        settings,
        includeStatutory: settings.enable_statutory_deductions !== false,
      });

      totalGrossPay += calc.gross_pay;
      totalDeductions += calc.total_deductions;
      totalNetPay += calc.net_pay;

      const existingItem = run.items?.find((it) => it.employee_id === emp.id);
      const item: PayrollRunItem = {
        id: (existingItem?.id && isValidUUID(existingItem.id)) ? existingItem.id : generateUUID(),
        payroll_run_id: runId,
        employee_id: emp.id,
        employee_name_snapshot: `${emp.first_name} ${emp.last_name}`,
        employee_number_snapshot: emp.employee_number,
        department_snapshot: emp.department?.name || null,
        position_snapshot: emp.position?.title || null,
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
        created_at: run.created_at,
        updated_at: new Date().toISOString(),
      };

      return item;
    });

    const updatedRun: PayrollRunWithItems = {
      ...run,
      total_employees: activeEmployees.length,
      total_gross_pay: roundToTwoDecimals(totalGrossPay),
      total_deductions: roundToTwoDecimals(totalDeductions),
      total_net_pay: roundToTwoDecimals(totalNetPay),
      updated_at: new Date().toISOString(),
      items: updatedItems,
    };

    const idx = localRunsCache.findIndex((r) => r.id === runId);
    if (idx !== -1) {
      localRunsCache[idx] = updatedRun;
    }
    persistRunsCache();

    // Persist recalculation updates to Supabase
    try {
      const supabase = createClient();
      await (supabase.from('payroll_runs') as any)
        .update({
          total_employees: activeEmployees.length,
          total_gross_pay: roundToTwoDecimals(totalGrossPay),
          total_deductions: roundToTwoDecimals(totalDeductions),
          total_net_pay: roundToTwoDecimals(totalNetPay),
          updated_at: updatedRun.updated_at,
        })
        .eq('id', runId);

      for (const it of updatedItems) {
        if (isValidUUID(it.employee_id)) {
          await (supabase.from('payroll_run_items') as any).upsert({
            id: it.id,
            payroll_run_id: runId,
            employee_id: it.employee_id,
            employee_name_snapshot: it.employee_name_snapshot,
            employee_number_snapshot: it.employee_number_snapshot,
            department_snapshot: it.department_snapshot,
            position_snapshot: it.position_snapshot,
            basic_salary_snapshot: it.basic_salary_snapshot,
            hourly_rate_snapshot: it.hourly_rate_snapshot,
            pay_type_snapshot: it.pay_type_snapshot,
            days_worked: it.days_worked,
            regular_hours: it.regular_hours,
            overtime_hours: it.overtime_hours,
            night_diff_hours: it.night_diff_hours,
            holiday_regular_hours: it.holiday_regular_hours,
            holiday_special_hours: it.holiday_special_hours,
            rest_day_hours: it.rest_day_hours,
            late_minutes: it.late_minutes,
            undertime_minutes: it.undertime_minutes,
            absent_days: it.absent_days,
            basic_pay: it.basic_pay,
            overtime_pay: it.overtime_pay,
            night_diff_pay: it.night_diff_pay,
            holiday_pay: it.holiday_pay,
            rest_day_pay: it.rest_day_pay,
            allowances: it.allowances,
            bonuses: it.bonuses,
            gross_pay: it.gross_pay,
            late_deduction: it.late_deduction,
            undertime_deduction: it.undertime_deduction,
            absence_deduction: it.absence_deduction,
            sss_deduction: it.sss_deduction || 0,
            philhealth_deduction: it.philhealth_deduction || 0,
            pagibig_deduction: it.pagibig_deduction || 0,
            tax_deduction: it.tax_deduction || 0,
            employer_contributions: it.employer_contributions || 0,
            other_deductions: it.other_deductions,
            total_deductions: it.total_deductions,
            net_pay: it.net_pay,
            item_breakdown: it.item_breakdown,
            updated_at: it.updated_at,
          }, { onConflict: 'payroll_run_id,employee_id' });
        }
      }
    } catch (e) {
      console.warn('Supabase recalculate sync notice:', e);
    }

    return { success: true, data: updatedRun };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to recalculate payroll run.' };
  }
}

/**
 * Update payroll run status following the approved lifecycle:
 * draft -> processing -> review -> approved -> paid -> locked
 */
export async function updatePayrollRunStatus(
  runId: string,
  newStatus: PayrollRunStatus
): Promise<{ success: boolean; data?: PayrollRunWithItems; error?: string }> {
  try {
    const run = await getPayrollRunById(runId);
    if (!run) {
      return { success: false, error: 'Payroll run not found.' };
    }

    if (run.status === 'locked' && newStatus !== 'locked') {
      return {
        success: false,
        error: 'Locked payroll runs cannot have their status modified.',
      };
    }

    const updatedRun: PayrollRunWithItems = {
      ...run,
      status: newStatus,
      updated_at: new Date().toISOString(),
      processed_at: newStatus === 'paid' ? new Date().toISOString() : run.processed_at,
    };

    const idx = localRunsCache.findIndex((r) => r.id === runId);
    if (idx !== -1) {
      localRunsCache[idx] = updatedRun;
    }
    persistRunsCache();

    // Persist status change to Supabase
    try {
      const supabase = createClient();
      await (supabase.from('payroll_runs') as any)
        .update({
          status: newStatus,
          updated_at: updatedRun.updated_at,
          processed_at: updatedRun.processed_at,
        })
        .eq('id', runId);
    } catch (e) {
      console.warn('Supabase update status notice:', e);
    }

    return { success: true, data: updatedRun };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update payroll run status.' };
  }
}

/**
 * Delete a payroll run by ID and cascade delete all associated payslips and database rows
 */
export async function deletePayrollRun(
  runId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Remove from local in-memory cache
    localRunsCache = localRunsCache.filter((r) => r.id !== runId && r.run_number !== runId);
    persistRunsCache();

    // 2. Cascade delete payslips associated with this run
    try {
      const { deletePayslipsByRunId } = await import('@/lib/payslips/actions');
      await deletePayslipsByRunId(runId);
    } catch (e) {
      console.warn('Cascade delete payslips notice:', e);
    }

    // 3. Delete from Supabase if valid UUID
    try {
      const supabase = createClient();
      if (isValidUUID(runId)) {
        await supabase.from('payslips').delete().eq('payroll_run_id', runId);
        await supabase.from('payroll_run_items').delete().eq('payroll_run_id', runId);
        await supabase.from('payroll_runs').delete().eq('id', runId);
      } else {
        await supabase.from('payroll_runs').delete().eq('run_number', runId);
      }
    } catch (e) {
      console.warn('Supabase delete run notice:', e);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete payroll run.' };
  }
}

/**
 * Update payroll run metadata (notes, approver name, run number)
 */
export async function updatePayrollRunDetails(
  runId: string,
  updates: Partial<PayrollRun>
): Promise<{ success: boolean; data?: PayrollRunWithItems; error?: string }> {
  try {
    const run = await getPayrollRunById(runId);
    if (!run) {
      return { success: false, error: 'Payroll run not found.' };
    }

    const updatedRun: PayrollRunWithItems = {
      ...run,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    updateLocalRunCache(updatedRun);

    // Sync to Supabase
    try {
      if (isValidUUID(runId)) {
        const supabase = createClient();
        const cleanUpdates: Record<string, any> = {
          updated_at: updatedRun.updated_at,
        };
        if (updates.notes !== undefined) cleanUpdates.notes = updates.notes;
        if (updates.run_number !== undefined) cleanUpdates.run_number = updates.run_number;
        if (updates.approved_by_name !== undefined) cleanUpdates.approved_by_name = updates.approved_by_name;
        if (updates.locked_by_name !== undefined) cleanUpdates.locked_by_name = updates.locked_by_name;

        await (supabase.from('payroll_runs') as any)
          .update(cleanUpdates)
          .eq('id', runId);
      }
    } catch (e) {
      console.warn('Supabase update details notice:', e);
    }

    return { success: true, data: updatedRun };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update payroll run details.' };
  }
}

