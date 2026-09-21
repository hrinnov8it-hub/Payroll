import { createClient } from '@/lib/supabase/client';
import {
  PayrollPeriod,
  AttendanceRecordWithEmployee,
  AttendanceFormData,
  AttendanceFilters,
} from '@/types/attendance';
import {
  fallbackPayrollPeriods,
  fallbackAttendanceRecords,
} from './mock-attendance';
import { getEmployees } from '@/lib/employees/actions';

// Local cache for in-memory edits when database table is not migrated yet
let localPeriodsCache: PayrollPeriod[] = [...fallbackPayrollPeriods];
let localAttendanceCache: AttendanceRecordWithEmployee[] = [...fallbackAttendanceRecords];

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem('innov8it_attendance_cache');
    if (stored) {
      localAttendanceCache = JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to parse attendance cache from localStorage', e);
  }
}

function persistAttendanceCache() {
  if (typeof window !== 'undefined') {
    window.localStorage.setItem('innov8it_attendance_cache', JSON.stringify(localAttendanceCache));
  }
}

/**
 * Fetch all available payroll periods
 */
export async function getPayrollPeriods(): Promise<PayrollPeriod[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_periods')
      .select('*')
      .order('start_date', { ascending: false });

    if (error || !data || data.length === 0) {
      return localPeriodsCache;
    }

    return data as PayrollPeriod[];
  } catch {
    return localPeriodsCache;
  }
}

/**
 * Fetch or initialize attendance records for a specific payroll period
 */
export async function getAttendanceForPeriod(
  periodId: string,
  filters?: AttendanceFilters
): Promise<AttendanceRecordWithEmployee[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employee:employees(
          *,
          department:departments(*),
          position:positions(*)
        ),
        payroll_period:payroll_periods(*)
      `)
      .eq('payroll_period_id', periodId);

    if (error || !data || data.length === 0) {
      return filterAndEnsureEmployeesInPeriod(periodId, localAttendanceCache, filters);
    }

    const records = data as unknown as AttendanceRecordWithEmployee[];
    return filterAndEnsureEmployeesInPeriod(periodId, records, filters);
  } catch {
    return filterAndEnsureEmployeesInPeriod(periodId, localAttendanceCache, filters);
  }
}

async function filterAndEnsureEmployeesInPeriod(
  periodId: string,
  existingRecords: AttendanceRecordWithEmployee[],
  filters?: AttendanceFilters
): Promise<AttendanceRecordWithEmployee[]> {
  const allEmployees = await getEmployees();
  const periods = await getPayrollPeriods();
  const activePeriod = periods.find((p) => p.id === periodId) || periods[0];

  // Map of existing records for this period
  const existingMap = new Map<string, AttendanceRecordWithEmployee>();
  existingRecords
    .filter((r) => r.payroll_period_id === periodId)
    .forEach((r) => {
      existingMap.set(r.employee_id, r);
    });

  // Ensure all active employees are represented
  const fullList: AttendanceRecordWithEmployee[] = allEmployees.map((emp) => {
    if (existingMap.has(emp.id)) {
      const rec = existingMap.get(emp.id)!;
      return {
        ...rec,
        employee: emp,
        payroll_period: activePeriod,
      };
    }

    // Default template for employee without recorded DTR
    return {
      id: `att-auto-${emp.id}-${periodId}`,
      employee_id: emp.id,
      payroll_period_id: periodId,
      days_worked: emp.status === 'active' ? 11 : 0,
      regular_hours: emp.status === 'active' ? 88 : 0,
      overtime_hours: 0,
      night_diff_hours: 0,
      late_minutes: 0,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 0,
      holiday_special_hours: 0,
      rest_day_hours: 0,
      notes: null,
      employee: emp,
      payroll_period: activePeriod,
    };
  });

  // Apply filters
  let filtered = fullList;
  if (filters?.department_id && filters.department_id !== 'all') {
    filtered = filtered.filter((r) => r.employee?.department_id === filters.department_id);
  }

  if (filters?.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    filtered = filtered.filter(
      (r) =>
        r.employee?.first_name.toLowerCase().includes(q) ||
        r.employee?.last_name.toLowerCase().includes(q) ||
        r.employee?.employee_number.toLowerCase().includes(q)
    );
  }

  return filtered;
}

/**
 * Save / Update an attendance record with full validation
 */
export async function saveAttendanceRecord(
  data: AttendanceFormData
): Promise<{ success: boolean; data?: AttendanceRecordWithEmployee; error?: string }> {
  // Validation
  if (data.days_worked < 0 || data.regular_hours < 0) {
    return { success: false, error: 'Days worked and regular hours cannot be negative.' };
  }
  if (data.overtime_hours < 0 || data.night_diff_hours < 0) {
    return { success: false, error: 'Overtime and night differential hours cannot be negative.' };
  }
  if (data.late_minutes < 0 || data.undertime_minutes < 0 || data.absent_days < 0) {
    return { success: false, error: 'Tardiness and absences cannot be negative.' };
  }

  try {
    const supabase = createClient();
    const payload = {
      employee_id: data.employee_id,
      payroll_period_id: data.payroll_period_id,
      days_worked: Number(data.days_worked),
      regular_hours: Number(data.regular_hours),
      overtime_hours: Number(data.overtime_hours),
      night_diff_hours: Number(data.night_diff_hours),
      late_minutes: Math.round(Number(data.late_minutes)),
      undertime_minutes: Math.round(Number(data.undertime_minutes)),
      absent_days: Number(data.absent_days),
      holiday_regular_hours: Number(data.holiday_regular_hours),
      holiday_special_hours: Number(data.holiday_special_hours),
      rest_day_hours: Number(data.rest_day_hours),
      notes: data.notes?.trim() || null,
      updated_at: new Date().toISOString(),
    };

    const { data: upserted, error } = await (supabase
      .from('attendance') as any)
      .upsert(payload, { onConflict: 'employee_id,payroll_period_id' })
      .select(`
        *,
        employee:employees(
          *,
          department:departments(*),
          position:positions(*)
        ),
        payroll_period:payroll_periods(*)
      `)
      .single();

    if (error) {
      // Fallback update in local cache
      const idx = localAttendanceCache.findIndex(
        (r) => r.employee_id === data.employee_id && r.payroll_period_id === data.payroll_period_id
      );

      const allEmps = await getEmployees();
      const emp = allEmps.find((e) => e.id === data.employee_id);
      const periods = await getPayrollPeriods();
      const period = periods.find((p) => p.id === data.payroll_period_id);

      const updatedRec: AttendanceRecordWithEmployee = {
        id: data.id || `att-local-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
        employee: emp || null,
        payroll_period: period || null,
      };

      if (idx !== -1) {
        localAttendanceCache[idx] = updatedRec;
      } else {
        localAttendanceCache.push(updatedRec);
      }
      persistAttendanceCache();

      return { success: true, data: updatedRec };
    }

    const result = upserted as AttendanceRecordWithEmployee;
    const idx = localAttendanceCache.findIndex(
      (r) => r.employee_id === data.employee_id && r.payroll_period_id === data.payroll_period_id
    );
    if (idx !== -1) {
      localAttendanceCache[idx] = result;
    } else {
      localAttendanceCache.push(result);
    }
    persistAttendanceCache();

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to save attendance record' };
  }
}
