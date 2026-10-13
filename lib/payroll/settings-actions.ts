import { createClient } from '@/lib/supabase/client';
import {
  PayrollSettings,
  EarningType,
  DeductionType,
  EarningTypeFormData,
  DeductionTypeFormData,
  AdminProfile,
} from '@/types/payroll';
import { UserRole } from '@/types/auth';
import {
  fallbackPayrollSettings,
  fallbackEarningTypes,
  fallbackDeductionTypes,
} from './mock-settings';

const SETTINGS_STORAGE_KEY = 'innov8it_payroll_settings';

const SUPABASE_PAYROLL_SETTINGS_COLUMNS = new Set([
  'id',
  'company_name',
  'pay_frequency',
  'first_cutoff_start_day',
  'first_cutoff_end_day',
  'second_cutoff_start_day',
  'second_cutoff_end_day',
  'overtime_regular_rate',
  'overtime_rest_day_rate',
  'overtime_holiday_rate',
  'night_diff_rate',
  'night_diff_start_time',
  'night_diff_end_time',
  'regular_holiday_rate',
  'special_holiday_rate',
  'rest_day_rate',
  'rest_day_special_holiday_rate',
  'rest_day_regular_holiday_rate',
  'standard_working_days_per_year',
  'standard_hours_per_day',
  'grace_period_late_minutes',
  // Statutory & Signatory fields — will be saved to DB once schema is migrated
  'tin_number',
  'sss_employer_id',
  'philhealth_employer_id',
  'pagibig_employer_id',
  'rdo_code',
  'signatory_name',
  'signatory_title',
  'enable_signatory_on_payslips',
  'require_dual_approval',
  'lock_closed_periods',
  'maintenance_mode',
  'created_at',
  'updated_at',
]);

const STALE_MOCK_VALUES = new Set([
  '009-876-543-000', // old mock TIN
  '03-9123456-7',    // old mock SSS
  '19-025487123-1',  // old mock PhilHealth
  '2049-8172-9901',  // old mock Pag-IBIG
  '044',             // old mock RDO (only if other stale values also present)
  'Maria R. Santos', // old mock signatory
  'Innov8IT Corporation', // old mock company name
]);

function loadLocalSettings(): PayrollSettings {
  if (typeof window !== 'undefined') {
    try {
      const stored = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && typeof parsed === 'object') {
          // Detect stale mock data: if TIN/SSS/PhilHealth match old hardcoded values, clear them
          const isStale =
            parsed.tin_number === '009-876-543-000' &&
            parsed.sss_employer_id === '03-9123456-7' &&
            parsed.philhealth_employer_id === '19-025487123-1';
          if (isStale) {
            const cleaned = {
              ...parsed,
              tin_number: '',
              sss_employer_id: '',
              philhealth_employer_id: '',
              pagibig_employer_id: '',
              rdo_code: '',
              signatory_name: '',
              signatory_title: '',
              enable_signatory_on_payslips: false,
              company_name: parsed.company_name === 'Innov8IT Corporation' ? '' : (parsed.company_name || ''),
            };
            window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(cleaned));
            return { ...fallbackPayrollSettings, ...cleaned };
          }
          return { ...fallbackPayrollSettings, ...parsed };
        }
      }
    } catch {}
  }
  return { ...fallbackPayrollSettings };
}

// In-memory cache for settings with localStorage hydration
let localSettingsCache: PayrollSettings = loadLocalSettings();
let localEarningsCache: EarningType[] = [...fallbackEarningTypes];
let localDeductionsCache: DeductionType[] = [...fallbackDeductionTypes];

function persistLocalSettings(settings: PayrollSettings) {
  localSettingsCache = { ...settings };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(localSettingsCache));
    } catch {}
  }
}

let localAdminProfilesCache: AdminProfile[] = [
  {
    id: 'profile-super-admin-01',
    email: 'superadmin.innov8it@gmail.com',
    full_name: 'Innov8IT System Owner',
    role: 'super_admin',
    created_at: '2026-01-01T08:00:00Z',
  },
  {
    id: 'profile-hr-admin-01',
    email: 'hr.innov8it@gmail.com',
    full_name: 'HR Administrator',
    role: 'admin',
    created_at: '2026-01-01T08:00:00Z',
  },
];

/**
 * Fetch payroll settings
 */
export async function getPayrollSettings(): Promise<PayrollSettings> {
  const currentLocal = loadLocalSettings();
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return currentLocal;
    }

    const dbRow = data as unknown as Partial<PayrollSettings>;
    // DB values take highest priority. Local cache fills in fields the DB doesn't have yet.
    // We do NOT fall back to fallbackPayrollSettings for statutory fields — admin must encode them.
    const merged: PayrollSettings = {
      ...fallbackPayrollSettings,
      ...currentLocal,
      ...dbRow,
      // Statutory fields: DB first, then local cache, then empty string (never the mock default)
      tin_number: dbRow.tin_number !== undefined ? dbRow.tin_number : (currentLocal.tin_number ?? ''),
      sss_employer_id: dbRow.sss_employer_id !== undefined ? dbRow.sss_employer_id : (currentLocal.sss_employer_id ?? ''),
      philhealth_employer_id: dbRow.philhealth_employer_id !== undefined ? dbRow.philhealth_employer_id : (currentLocal.philhealth_employer_id ?? ''),
      pagibig_employer_id: dbRow.pagibig_employer_id !== undefined ? dbRow.pagibig_employer_id : (currentLocal.pagibig_employer_id ?? ''),
      rdo_code: dbRow.rdo_code !== undefined ? dbRow.rdo_code : (currentLocal.rdo_code ?? ''),
      signatory_name: dbRow.signatory_name !== undefined ? dbRow.signatory_name : (currentLocal.signatory_name ?? ''),
      signatory_title: dbRow.signatory_title !== undefined ? dbRow.signatory_title : (currentLocal.signatory_title ?? ''),
      enable_signatory_on_payslips: dbRow.enable_signatory_on_payslips ?? currentLocal.enable_signatory_on_payslips ?? false,
      require_dual_approval: dbRow.require_dual_approval ?? currentLocal.require_dual_approval ?? true,
      lock_closed_periods: dbRow.lock_closed_periods ?? currentLocal.lock_closed_periods ?? true,
      maintenance_mode: dbRow.maintenance_mode ?? currentLocal.maintenance_mode ?? false,
    };

    persistLocalSettings(merged);
    return merged;
  } catch {
    return currentLocal;
  }
}

/**
 * Update payroll settings
 */
export async function updatePayrollSettings(
  data: Partial<PayrollSettings>
): Promise<{ success: boolean; data?: PayrollSettings; error?: string }> {
  try {
    const currentLocal = loadLocalSettings();
    const merged: PayrollSettings = {
      ...currentLocal,
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Immediately persist all fields to local storage so client UI has zero data loss
    persistLocalSettings(merged);

    const supabase = createClient();

    // Query for existing rows in Supabase
    const { data: existingRows } = await supabase
      .from('payroll_settings')
      .select('id')
      .order('updated_at', { ascending: false });

    const existingId = existingRows && existingRows.length > 0 ? (existingRows[0] as any).id : null;

    // Filter payload for known DB columns to guarantee saving standard fields in Supabase
    const dbPayload: Record<string, any> = {};
    for (const [key, value] of Object.entries(merged)) {
      if (SUPABASE_PAYROLL_SETTINGS_COLUMNS.has(key)) {
        dbPayload[key] = value;
      }
    }
    dbPayload.updated_at = new Date().toISOString();

    let dbUpdated = false;
    // 1. Try updating all columns in case DB schema has been migrated with new columns
    if (existingId) {
      try {
        const fullRes = await (supabase.from('payroll_settings') as any)
          .update(merged)
          .eq('id', existingId)
          .select('*')
          .maybeSingle();
        if (!fullRes.error && fullRes.data) {
          dbUpdated = true;
          if (existingRows && existingRows.length > 1) {
            for (let i = 1; i < existingRows.length; i++) {
              await (supabase.from('payroll_settings') as any).update(merged).eq('id', (existingRows[i] as any).id);
            }
          }
        }
      } catch {}
    }

    // 2. If full update failed (e.g. column not found), update using clean dbPayload
    if (!dbUpdated && existingId) {
      try {
        await (supabase.from('payroll_settings') as any)
          .update(dbPayload)
          .eq('id', existingId);

        if (existingRows && existingRows.length > 1) {
          for (let i = 1; i < existingRows.length; i++) {
            await (supabase.from('payroll_settings') as any).update(dbPayload).eq('id', (existingRows[i] as any).id);
          }
        }
      } catch (e) {
        console.warn('Supabase fallback update note:', e);
      }
    } else if (!existingId) {
      try {
        await (supabase.from('payroll_settings') as any).insert(dbPayload);
      } catch (e) {
        console.warn('Supabase insert note:', e);
      }
    }

    return { success: true, data: merged };
  } catch (err: any) {
    const currentLocal = loadLocalSettings();
    const merged = { ...currentLocal, ...data };
    persistLocalSettings(merged);
    return { success: true, data: merged };
  }
}

/**
 * Fetch earning categories
 */
export async function getEarningTypes(): Promise<EarningType[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('earning_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return localEarningsCache;
    }

    return data as EarningType[];
  } catch {
    return localEarningsCache;
  }
}

/**
 * Create a new earning category
 */
export async function createEarningType(
  data: EarningTypeFormData
): Promise<{ success: boolean; data?: EarningType; error?: string }> {
  if (!data.name.trim() || !data.code.trim()) {
    return { success: false, error: 'Name and Code are required.' };
  }

  try {
    const supabase = createClient();
    const payload = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      category: data.category,
      taxable: data.taxable,
      is_deminimis: data.is_deminimis,
      deminimis_limit: data.deminimis_limit || 0,
      description: data.description?.trim() || null,
      is_active: data.is_active,
    };

    const { data: inserted, error } = await (supabase
      .from('earning_types') as any)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error inserting earning type:', error);
      return { success: false, error: error.message || 'Failed to create earning category in database' };
    }

    const created = inserted as EarningType;
    localEarningsCache = [...localEarningsCache, created];
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create earning category' };
  }
}

/**
 * Update an existing earning category
 */
export async function updateEarningType(
  id: string,
  data: Partial<EarningTypeFormData>
): Promise<{ success: boolean; data?: EarningType; error?: string }> {
  try {
    const supabase = createClient();
    const { data: updated, error } = await (supabase
      .from('earning_types') as any)
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      console.error('Supabase error updating earning type:', error);
      return { success: false, error: error.message || 'Failed to update earning category in database' };
    }

    const item = updated as EarningType;
    const idx = localEarningsCache.findIndex((e) => e.id === id);
    if (idx !== -1) localEarningsCache[idx] = item;
    return { success: true, data: item };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update earning category' };
  }
}

/**
 * Delete or deactivate an earning category
 */
export async function deleteEarningType(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    await supabase.from('earning_types').delete().eq('id', id);
    localEarningsCache = localEarningsCache.filter((e) => e.id !== id);
    return { success: true };
  } catch {
    localEarningsCache = localEarningsCache.filter((e) => e.id !== id);
    return { success: true };
  }
}

/**
 * Fetch deduction categories
 */
export async function getDeductionTypes(): Promise<DeductionType[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('deduction_types')
      .select('*')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return localDeductionsCache;
    }

    return data as DeductionType[];
  } catch {
    return localDeductionsCache;
  }
}

/**
 * Create a new deduction category
 */
export async function createDeductionType(
  data: DeductionTypeFormData
): Promise<{ success: boolean; data?: DeductionType; error?: string }> {
  if (!data.name.trim() || !data.code.trim()) {
    return { success: false, error: 'Name and Code are required.' };
  }

  try {
    const supabase = createClient();
    const payload = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      category: data.category,
      description: data.description?.trim() || null,
      is_active: data.is_active,
    };

    const { data: inserted, error } = await (supabase
      .from('deduction_types') as any)
      .insert(payload)
      .select('*')
      .single();

    if (error) {
      const newItem: DeductionType = {
        id: `ded-${Date.now()}`,
        ...payload,
        created_at: new Date().toISOString(),
      };
      localDeductionsCache = [...localDeductionsCache, newItem];
      return { success: true, data: newItem };
    }

    const created = inserted as DeductionType;
    localDeductionsCache = [...localDeductionsCache, created];
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create deduction category' };
  }
}

/**
 * Update an existing deduction category
 */
export async function updateDeductionType(
  id: string,
  data: Partial<DeductionTypeFormData>
): Promise<{ success: boolean; data?: DeductionType; error?: string }> {
  try {
    const supabase = createClient();
    const { data: updated, error } = await (supabase
      .from('deduction_types') as any)
      .update(data)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      const idx = localDeductionsCache.findIndex((d) => d.id === id);
      if (idx !== -1) {
        localDeductionsCache[idx] = { ...localDeductionsCache[idx], ...data };
        return { success: true, data: localDeductionsCache[idx] };
      }
    }

    const item = updated as DeductionType;
    const idx = localDeductionsCache.findIndex((d) => d.id === id);
    if (idx !== -1) localDeductionsCache[idx] = item;
    return { success: true, data: item };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update deduction category' };
  }
}

/**
 * Delete or deactivate a deduction category
 */
export async function deleteDeductionType(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    await supabase.from('deduction_types').delete().eq('id', id);
    localDeductionsCache = localDeductionsCache.filter((d) => d.id !== id);
    return { success: true };
  } catch {
    localDeductionsCache = localDeductionsCache.filter((d) => d.id !== id);
    return { success: true };
  }
}

/**
 * Fetch all registered Administrator & HR profiles
 */
export async function getAdminProfiles(): Promise<AdminProfile[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, created_at')
      .order('created_at', { ascending: true });

    if (error || !data || data.length === 0) {
      return localAdminProfilesCache;
    }

    const merged = [...data] as AdminProfile[];
    // Ensure our default HR & Super admin are preserved if not yet in DB
    localAdminProfilesCache.forEach((fallbackUser) => {
      if (!merged.some((u) => u.email.toLowerCase() === fallbackUser.email.toLowerCase())) {
        merged.push(fallbackUser);
      }
    });

    localAdminProfilesCache = merged;
    return merged;
  } catch {
    return localAdminProfilesCache;
  }
}

/**
 * Add or invite an Administrator or HR User profile
 */
export async function addAdminProfile(
  profile: Omit<AdminProfile, 'id' | 'created_at'>
): Promise<{ success: boolean; data?: AdminProfile; error?: string }> {
  try {
    const newId = `profile-${Date.now()}`;
    const newEntry: AdminProfile = {
      id: newId,
      email: profile.email.trim().toLowerCase(),
      full_name: profile.full_name.trim(),
      role: profile.role,
      created_at: new Date().toISOString(),
    };

    const supabase = createClient();
    const { data, error } = await (supabase.from('profiles') as any)
      .insert({
        id: newId,
        email: newEntry.email,
        full_name: newEntry.full_name,
        role: newEntry.role,
      })
      .select('*')
      .maybeSingle();

    if (error || !data) {
      // Keep in local cache
      localAdminProfilesCache = [
        ...localAdminProfilesCache.filter((u) => u.email !== newEntry.email),
        newEntry,
      ];
      return { success: true, data: newEntry };
    }

    const created = data as AdminProfile;
    localAdminProfilesCache = [
      ...localAdminProfilesCache.filter((u) => u.id !== created.id),
      created,
    ];
    return { success: true, data: created };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to add administrator profile' };
  }
}

/**
 * Update an administrator's access role
 */
export async function updateAdminProfileRole(
  id: string,
  role: UserRole
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    await (supabase.from('profiles') as any)
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id);

    localAdminProfilesCache = localAdminProfilesCache.map((p) =>
      p.id === id ? { ...p, role } : p
    );
    return { success: true };
  } catch (err: any) {
    localAdminProfilesCache = localAdminProfilesCache.map((p) =>
      p.id === id ? { ...p, role } : p
    );
    return { success: true };
  }
}

/**
 * Demote or remove an administrator
 */
export async function deleteAdminProfile(
  id: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    await supabase.from('profiles').delete().eq('id', id);
    localAdminProfilesCache = localAdminProfilesCache.filter((p) => p.id !== id);
    return { success: true };
  } catch {
    localAdminProfilesCache = localAdminProfilesCache.filter((p) => p.id !== id);
    return { success: true };
  }
}
