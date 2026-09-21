import { createClient } from '@/lib/supabase/client';
import {
  PayrollSettings,
  EarningType,
  DeductionType,
  EarningTypeFormData,
  DeductionTypeFormData,
} from '@/types/payroll';
import {
  fallbackPayrollSettings,
  fallbackEarningTypes,
  fallbackDeductionTypes,
} from './mock-settings';

// In-memory cache for changes if remote database table is not yet migrated
let localSettingsCache: PayrollSettings = { ...fallbackPayrollSettings };
let localEarningsCache: EarningType[] = [...fallbackEarningTypes];
let localDeductionsCache: DeductionType[] = [...fallbackDeductionTypes];

/**
 * Fetch payroll settings
 */
export async function getPayrollSettings(): Promise<PayrollSettings> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('payroll_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return localSettingsCache;
    }

    return data as unknown as PayrollSettings;
  } catch {
    return localSettingsCache;
  }
}

/**
 * Update payroll settings
 */
export async function updatePayrollSettings(
  data: Partial<PayrollSettings>
): Promise<{ success: boolean; data?: PayrollSettings; error?: string }> {
  try {
    const supabase = createClient();
    const payload = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    // Find existing row by querying for any record
    const { data: existing } = await supabase
      .from('payroll_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    const existingId = (existing as any)?.id;
    let updated: any = null;
    let error: any = null;

    if (existingId) {
      const res = await (supabase.from('payroll_settings') as any)
        .update(payload)
        .eq('id', existingId)
        .select('*')
        .maybeSingle();
      updated = res.data;
      error = res.error;
    } else {
      const res = await (supabase.from('payroll_settings') as any)
        .insert(payload)
        .select('*')
        .maybeSingle();
      updated = res.data;
      error = res.error;
    }

    if (error || !updated) {
      console.warn('Supabase settings update note:', error?.message);
      localSettingsCache = { ...localSettingsCache, ...payload };
      return { success: true, data: localSettingsCache };
    }

    localSettingsCache = updated as unknown as PayrollSettings;
    return { success: true, data: localSettingsCache };
  } catch (err: any) {
    localSettingsCache = { ...localSettingsCache, ...data };
    return { success: true, data: localSettingsCache };
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
