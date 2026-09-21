import { createClient } from '@/lib/supabase/client';
import { fallbackDepartments, fallbackPositions, fallbackEmployees } from '@/lib/employees/mock-data';
import { fallbackPayrollSettings } from '@/lib/payroll/mock-settings';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

const DEFAULT_DEPARTMENTS = [
  { name: 'Engineering', code: 'ENG', description: 'Software engineering, platform architecture, and IT operations' },
  { name: 'Human Resources', code: 'HR', description: 'HR, recruitment, and employee relations' },
  { name: 'Finance & Accounting', code: 'FIN', description: 'Finance, accounting, and payroll compliance' },
  { name: 'Operations', code: 'OPS', description: 'Day-to-day business and administrative operations' },
  { name: 'Sales & Marketing', code: 'MKT', description: 'Client development and growth' },
];

/**
 * Synchronizes all local and default data into Supabase
 */
export async function syncAllDataToSupabase(): Promise<{
  success: boolean;
  synced: {
    departments: number;
    positions: number;
    employees: number;
    settings: boolean;
    attendance: number;
    runs: number;
    runItems: number;
    payslips: number;
  };
  errors: string[];
}> {
  const supabase = createClient();
  const errors: string[] = [];
  const stats = {
    departments: 0,
    positions: 0,
    employees: 0,
    settings: false,
    attendance: 0,
    runs: 0,
    runItems: 0,
    payslips: 0,
  };

  try {
    // 1. Sync Departments
    const { data: deptData, error: deptError } = await (supabase.from('departments') as any).upsert(
      DEFAULT_DEPARTMENTS,
      { onConflict: 'code' }
    ).select();

    if (deptError) {
      errors.push(`Departments: ${deptError.message}`);
    } else {
      stats.departments = deptData?.length || DEFAULT_DEPARTMENTS.length;
    }

    // Fetch existing departments to map UUIDs
    const { data: currentDepts } = await supabase.from('departments').select('id, code');
    const deptMap = new Map((currentDepts || []).map((d: any) => [d.code, d.id]));

    // 2. Sync Positions
    const posToInsert = [
      { department_id: deptMap.get('ENG'), title: 'Engineering Lead', description: 'Technical lead for platform' },
      { department_id: deptMap.get('ENG'), title: 'Senior Software Engineer', description: 'Full-stack software development' },
      { department_id: deptMap.get('HR'), title: 'HR Manager', description: 'Manages HR department and compliance' },
      { department_id: deptMap.get('HR'), title: 'HR & Payroll Specialist', description: 'Payroll execution and records' },
      { department_id: deptMap.get('FIN'), title: 'Senior Accountant', description: 'Financial audits and taxation' },
      { department_id: deptMap.get('OPS'), title: 'Operations Specialist', description: 'Operational workflows' },
    ].filter((p) => p.department_id);

    if (posToInsert.length > 0) {
      const { data: posData, error: posError } = await (supabase.from('positions') as any).upsert(
        posToInsert,
        { onConflict: 'title' }
      ).select();

      if (posError) {
        errors.push(`Positions: ${posError.message}`);
      } else {
        stats.positions = posData?.length || posToInsert.length;
      }
    }

    // 3. Sync Employees (Merge fallbackEmployees with localStorage cache if available)
    let allEmployees = [...fallbackEmployees];
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('innov8it_employees_cache');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            allEmployees = parsed;
          }
        }
      } catch {}
    }

    if (allEmployees.length > 0) {
      const employeeRows = allEmployees.map((e) => {
        const row: any = {
          employee_number: e.employee_number,
          first_name: e.first_name,
          middle_name: e.middle_name || null,
          last_name: e.last_name,
          email: e.email,
          department_id: isValidUUID(e.department_id) ? e.department_id : (deptMap.get('ENG') || null),
          position_id: isValidUUID(e.position_id) ? e.position_id : null,
          employment_type: e.employment_type || 'regular',
          status: e.status || 'active',
          pay_type: e.pay_type || 'monthly',
          basic_salary: Number(e.basic_salary || 0),
          hourly_rate: Number(e.hourly_rate || 0),
          hire_date: e.hire_date || (e as any).date_hired || new Date().toISOString().split('T')[0],
        };
        if (isValidUUID(e.id)) {
          row.id = e.id;
        }
        return row;
      });

      const { data: empData, error: empError } = await (supabase.from('employees') as any).upsert(
        employeeRows,
        { onConflict: 'employee_number' }
      ).select();

      if (empError) {
        errors.push(`Employees: ${empError.message}`);
      } else {
        stats.employees = empData?.length || employeeRows.length;
      }
    }

    // 4. Sync Payroll Settings
    let currentSettings: any = { ...fallbackPayrollSettings };
    if (typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem('innov8it_payroll_settings');
        if (stored) currentSettings = JSON.parse(stored);
      } catch {}
    }

    const { data: existingSettings } = await supabase
      .from('payroll_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    let settingsErr: any = null;
    const settingsPayload = {
      company_name: currentSettings.company_name || 'Innov8IT Inc.',
      pay_frequency: currentSettings.pay_frequency || 'semi_monthly',
      standard_working_days_per_year: currentSettings.standard_working_days_per_year || 261,
      standard_hours_per_day: currentSettings.standard_hours_per_day || 8.0,
      enable_statutory_deductions: currentSettings.enable_statutory_deductions !== false,
      updated_at: new Date().toISOString(),
    };

    const existingSettingsId = (existingSettings as any)?.id;
    if (existingSettingsId) {
      const res = await (supabase.from('payroll_settings') as any)
        .update(settingsPayload)
        .eq('id', existingSettingsId);
      settingsErr = res.error;
    } else {
      const res = await (supabase.from('payroll_settings') as any)
        .insert(settingsPayload);
      settingsErr = res.error;
    }

    if (settingsErr) {
      errors.push(`Settings: ${settingsErr.message}`);
    } else {
      stats.settings = true;
    }

    // 5. Sync Payroll Runs if available in localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedRuns = window.localStorage.getItem('innov8it_runs_cache');
        if (storedRuns) {
          const runsList = JSON.parse(storedRuns);
          for (const r of runsList) {
            if (!isValidUUID(r.id) || !isValidUUID(r.payroll_period_id)) continue;

            const { error: runErr } = await (supabase.from('payroll_runs') as any).upsert({
              id: r.id,
              payroll_period_id: r.payroll_period_id,
              run_number: r.run_number,
              status: r.status,
              total_employees: r.total_employees,
              total_gross_pay: r.total_gross_pay,
              total_deductions: r.total_deductions,
              total_net_pay: r.total_net_pay,
              notes: r.notes,
              created_at: r.created_at,
              updated_at: r.updated_at,
            }, { onConflict: 'id' });

            if (runErr) {
              errors.push(`Run ${r.run_number}: ${runErr.message}`);
            } else {
              stats.runs++;
            }
          }
        }
      } catch (err: any) {
        errors.push(`Runs sync: ${err.message}`);
      }
    }

    return {
      success: errors.length === 0,
      synced: stats,
      errors,
    };
  } catch (err: any) {
    return {
      success: false,
      synced: stats,
      errors: [err.message || 'Failed to sync data to Supabase'],
    };
  }
}
