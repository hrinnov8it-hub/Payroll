import { createClient } from '@/lib/supabase/client';
import {
  Department,
  Position,
  Employee,
  EmployeeWithRelations,
  EmployeeFormData,
  EmployeeFilters,
  PayType,
} from '@/types/employee';
import {
  fallbackDepartments,
  fallbackPositions,
  fallbackEmployees,
} from './mock-data';

/**
 * Calculates hourly rate based on Philippine payroll standard (261 working days/year)
 */
export function calculateHourlyRate(basicSalary: number, payType: PayType): number {
  if (!basicSalary || basicSalary <= 0) return 0;

  switch (payType) {
    case 'monthly': {
      // Philippine Standard: (Monthly Salary * 12 months) / (261 days * 8 hours)
      const hourly = (basicSalary * 12) / (261 * 8);
      return Math.round(hourly * 100) / 100;
    }
    case 'daily': {
      const hourly = basicSalary / 8;
      return Math.round(hourly * 100) / 100;
    }
    case 'hourly':
      return Math.round(basicSalary * 100) / 100;
  }
}

// In-memory store for newly added/edited employees in case remote database table isn't migrated yet
let localEmployeesCache: EmployeeWithRelations[] = [...fallbackEmployees];

if (typeof window !== 'undefined') {
  try {
    const stored = window.localStorage.getItem('innov8it_employees_cache');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        localEmployeesCache = parsed;
      }
    }
  } catch {}
}

function persistEmployeesCache() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem('innov8it_employees_cache', JSON.stringify(localEmployeesCache));
    } catch {}
  }
}

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Fetch all departments
 */
export async function getDepartments(): Promise<Department[]> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (error || !data || data.length === 0) {
      return fallbackDepartments;
    }

    return data as Department[];
  } catch {
    return fallbackDepartments;
  }
}

/**
 * Fetch positions, optionally filtered by department
 */
export async function getPositions(departmentId?: string): Promise<Position[]> {
  try {
    const supabase = createClient();
    let query = supabase.from('positions').select('*').order('title', { ascending: true });

    if (departmentId) {
      query = query.eq('department_id', departmentId);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      if (departmentId) {
        return fallbackPositions.filter((p) => p.department_id === departmentId);
      }
      return fallbackPositions;
    }

    return data as Position[];
  } catch {
    if (departmentId) {
      return fallbackPositions.filter((p) => p.department_id === departmentId);
    }
    return fallbackPositions;
  }
}

/**
 * Fetch employees with relations and filter criteria
 */
export async function getEmployees(filters?: EmployeeFilters): Promise<EmployeeWithRelations[]> {
  try {
    const supabase = createClient();
    let query = supabase
      .from('employees')
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .order('created_at', { ascending: false });

    if (filters?.department_id && filters.department_id !== 'all') {
      query = query.eq('department_id', filters.department_id);
    }

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters?.employment_type && filters.employment_type !== 'all') {
      query = query.eq('employment_type', filters.employment_type);
    }

    if (filters?.pay_type && filters.pay_type !== 'all') {
      query = query.eq('pay_type', filters.pay_type);
    }

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return filterLocalEmployees(localEmployeesCache, filters);
    }

    let results = data as unknown as EmployeeWithRelations[];

    // Merge any locally cached employees that haven't synced yet
    for (const localEmp of localEmployeesCache) {
      if (!results.some((r) => r.id === localEmp.id || r.employee_number === localEmp.employee_number)) {
        results.push(localEmp);
      }
    }

    if (filters?.search && filters.search.trim()) {
      const q = filters.search.toLowerCase().trim();
      results = results.filter(
        (emp) =>
          emp.first_name.toLowerCase().includes(q) ||
          emp.last_name.toLowerCase().includes(q) ||
          emp.employee_number.toLowerCase().includes(q) ||
          emp.email.toLowerCase().includes(q)
      );
    }

    return results;
  } catch {
    return filterLocalEmployees(localEmployeesCache, filters);
  }
}

function filterLocalEmployees(
  employees: EmployeeWithRelations[],
  filters?: EmployeeFilters
): EmployeeWithRelations[] {
  let list = [...employees];

  if (!filters) return list;

  if (filters.department_id && filters.department_id !== 'all') {
    list = list.filter((emp) => emp.department_id === filters.department_id);
  }

  if (filters.status && filters.status !== 'all') {
    list = list.filter((emp) => emp.status === filters.status);
  }

  if (filters.employment_type && filters.employment_type !== 'all') {
    list = list.filter((emp) => emp.employment_type === filters.employment_type);
  }

  if (filters.pay_type && filters.pay_type !== 'all') {
    list = list.filter((emp) => emp.pay_type === filters.pay_type);
  }

  if (filters.search && filters.search.trim()) {
    const q = filters.search.toLowerCase().trim();
    list = list.filter(
      (emp) =>
        emp.first_name.toLowerCase().includes(q) ||
        emp.last_name.toLowerCase().includes(q) ||
        emp.employee_number.toLowerCase().includes(q) ||
        emp.email.toLowerCase().includes(q)
    );
  }

  return list;
}

/**
 * Fetch a single employee by ID
 */
export async function getEmployeeById(id: string): Promise<EmployeeWithRelations | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .eq('id', id)
      .single();

    if (error || !data) {
      const found = localEmployeesCache.find((e) => e.id === id);
      return found || null;
    }

    return data as unknown as EmployeeWithRelations;
  } catch {
    const found = localEmployeesCache.find((e) => e.id === id);
    return found || null;
  }
}

/**
 * Create a new employee
 */
export async function createEmployee(
  data: EmployeeFormData
): Promise<{ success: boolean; data?: EmployeeWithRelations; error?: string }> {
  // 1. Validation
  if (!data.first_name.trim() || !data.last_name.trim()) {
    return { success: false, error: 'First name and last name are required.' };
  }

  if (!data.email.trim() || !data.email.includes('@')) {
    return { success: false, error: 'A valid email address is required.' };
  }

  if (!data.employee_number.trim()) {
    return { success: false, error: 'Employee Number is required.' };
  }

  if (!data.department_id) {
    return { success: false, error: 'Please select a department.' };
  }

  if (!data.position_id) {
    return { success: false, error: 'Please select a position.' };
  }

  if (data.basic_salary < 0) {
    return { success: false, error: 'Basic salary cannot be negative.' };
  }

  const computedHourly =
    data.hourly_rate > 0 ? data.hourly_rate : calculateHourlyRate(data.basic_salary, data.pay_type);

  try {
    const supabase = createClient();
    const payload = {
      employee_number: data.employee_number.trim(),
      first_name: data.first_name.trim(),
      middle_name: data.middle_name?.trim() || null,
      last_name: data.last_name.trim(),
      email: data.email.trim().toLowerCase(),
      department_id: isValidUUID(data.department_id) ? data.department_id : null,
      position_id: isValidUUID(data.position_id) ? data.position_id : null,
      employment_type: data.employment_type,
      pay_type: data.pay_type,
      basic_salary: data.basic_salary,
      hourly_rate: computedHourly,
      hire_date: data.hire_date || new Date().toISOString().split('T')[0],
      status: data.status,
    };

    const { data: inserted, error } = await supabase
      .from('employees')
      .insert(payload as any)
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .single();

    if (error) {
      console.warn('Supabase employee creation note (using local cache):', error.message);
      // Fallback for offline / unmigrated dev environment
      const depts = await getDepartments();
      const positions = await getPositions();
      const dept = depts.find((d) => d.id === data.department_id);
      const pos = positions.find((p) => p.id === data.position_id);

      const newRecord: EmployeeWithRelations = {
        id: `emp-local-${Date.now()}`,
        ...payload,
        department_id: data.department_id,
        position_id: data.position_id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        department: dept || null,
        position: pos || null,
      };

      localEmployeesCache = [newRecord, ...localEmployeesCache];
      persistEmployeesCache();
      return { success: true, data: newRecord };
    }

    const createdRecord = inserted as unknown as EmployeeWithRelations;
    localEmployeesCache = [createdRecord, ...localEmployeesCache.filter((e) => e.employee_number !== data.employee_number)];
    persistEmployeesCache();
    return { success: true, data: createdRecord };

    return { success: true, data: inserted as unknown as EmployeeWithRelations };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create employee.' };
  }
}

/**
 * Update an existing employee
 */
export async function updateEmployee(
  id: string,
  data: Partial<EmployeeFormData>
): Promise<{ success: boolean; data?: EmployeeWithRelations; error?: string }> {
  if (data.email && (!data.email.trim() || !data.email.includes('@'))) {
    return { success: false, error: 'A valid email address is required.' };
  }

  try {
    const computedHourly =
      data.basic_salary !== undefined && data.pay_type
        ? (data.hourly_rate && data.hourly_rate > 0
            ? data.hourly_rate
            : calculateHourlyRate(data.basic_salary, data.pay_type))
        : data.hourly_rate;

    const supabase = createClient();
    const updatePayload: Record<string, any> = { ...data };
    if (computedHourly !== undefined) {
      updatePayload.hourly_rate = computedHourly;
    }
    updatePayload.updated_at = new Date().toISOString();

    const { data: updated, error } = await (supabase
      .from('employees') as any)
      .update(updatePayload)
      .eq('id', id)
      .select(`
        *,
        department:departments(*),
        position:positions(*)
      `)
      .single();

    if (error) {
      // Fallback update in local cache
      const idx = localEmployeesCache.findIndex((e) => e.id === id);
      if (idx !== -1) {
        const depts = await getDepartments();
        const positions = await getPositions();
        const deptId = data.department_id || localEmployeesCache[idx].department_id;
        const posId = data.position_id || localEmployeesCache[idx].position_id;

        localEmployeesCache[idx] = {
          ...localEmployeesCache[idx],
          ...updatePayload,
          department: depts.find((d) => d.id === deptId) || localEmployeesCache[idx].department,
          position: positions.find((p) => p.id === posId) || localEmployeesCache[idx].position,
        };
        persistEmployeesCache();
        return { success: true, data: localEmployeesCache[idx] };
      }
    }

    if (updated) {
      const idx = localEmployeesCache.findIndex((e) => e.id === id);
      if (idx !== -1) {
        localEmployeesCache[idx] = updated as unknown as EmployeeWithRelations;
        persistEmployeesCache();
      }
    }

    return { success: true, data: updated as unknown as EmployeeWithRelations };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to update employee.' };
  }
}

/**
 * Delete or soft-delete an employee
 */
export async function deleteEmployee(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = createClient();
    const { error } = await supabase.from('employees').delete().eq('id', id);

    localEmployeesCache = localEmployeesCache.filter((e) => e.id !== id);
    persistEmployeesCache();
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to delete employee.' };
  }
}
