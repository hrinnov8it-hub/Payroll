import { createClient } from '@/lib/supabase/client';
import { fallbackDepartments, fallbackPositions, fallbackEmployees } from '@/lib/employees/mock-data';
import { fallbackPayrollSettings } from '@/lib/payroll/mock-settings';

function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

const DEFAULT_DEPARTMENTS = [
  { name: 'Internal Department', code: 'INT', description: 'Internal administration, operations, human resources, and general company affairs' },
  { name: 'Tech Department', code: 'TECH', description: 'Software development, systems architecture, IT infrastructure, and technical platforms' },
  { name: 'Creative Department', code: 'CREATIVE', description: 'Creative direction, UI/UX design, multimedia production, and brand design' },
  { name: 'QA Department', code: 'QA', description: 'Quality assurance, test automation, software verification, and compliance testing' },
];

/**
 * Synchronizes all local and default data into Supabase
 */
export async function syncAllDataToSupabase(client?: ReturnType<typeof createClient>): Promise<{
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
  const supabase = client ?? createClient();
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
    const { data: existingPos } = await supabase.from('positions').select('title, department_id');
    const existingTitles = new Set((existingPos || []).map((p: any) => `${p.department_id}-${p.title}`));

    const posToInsert = [
      // Internal Department
      { department_id: deptMap.get('INT'), title: 'CEO', description: 'Chief Executive Officer and strategic executive leadership' },
      { department_id: deptMap.get('INT'), title: 'Operations Manager', description: 'Directs company operations, internal workflows, and operational execution' },
      { department_id: deptMap.get('INT'), title: 'HR/Admin', description: 'Human resources management, payroll administration, and office operations' },

      // Tech Department
      { department_id: deptMap.get('TECH'), title: 'Sr. Tech', description: 'Senior technical lead, software architecture, and systems engineering' },
      { department_id: deptMap.get('TECH'), title: 'Jr. Tech', description: 'Junior technical engineer, software development, and systems support' },

      // Creative Department
      { department_id: deptMap.get('CREATIVE'), title: 'Creative Head', description: 'Creative direction, brand identity, and design strategy' },
      { department_id: deptMap.get('CREATIVE'), title: 'UI/UX Designer', description: 'Designs intuitive user interfaces, wireframes, and design systems' },
      { department_id: deptMap.get('CREATIVE'), title: 'Video Editor', description: 'Video production, motion graphics, audio editing, and video post-production' },

      // QA Department
      { department_id: deptMap.get('QA'), title: 'Sr. Tech', description: 'Senior quality assurance specialist and test automation lead' },
      { department_id: deptMap.get('QA'), title: 'Jr. Tech', description: 'Junior quality assurance tester and validation support' },
    ].filter((p) => p.department_id && !existingTitles.has(`${p.department_id}-${p.title}`));

    if (posToInsert.length > 0) {
      const { data: posData, error: posError } = await (supabase.from('positions') as any).insert(posToInsert).select();
      if (posError) {
        errors.push(`Positions: ${posError.message}`);
      } else {
        stats.positions = (posData?.length || 0) + (existingPos?.length || 0);
      }
    } else {
      stats.positions = existingPos?.length || 0;
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

    // 4.5 Sync Cutoff Periods so payroll runs always have valid foreign key references
    const DEFAULT_PERIODS = [
      { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'October 2026 - 1st Half Cutoff', start_date: '2026-10-01', end_date: '2026-10-15', payout_date: '2026-10-20', status: 'open' },
      { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'October 2026 - 2nd Half Cutoff', start_date: '2026-10-16', end_date: '2026-10-31', payout_date: '2026-11-05', status: 'open' },
      { id: 'a1b2c3d4-0003-4000-8000-000000000003', name: 'September 2026 - 2nd Half Cutoff', start_date: '2026-09-16', end_date: '2026-09-30', payout_date: '2026-10-05', status: 'closed' },
    ];
    const { error: periodErr } = await (supabase.from('payroll_periods') as any).upsert(DEFAULT_PERIODS, { onConflict: 'id' });
    if (periodErr) {
      errors.push(`Periods: ${periodErr.message}`);
    }

    // 5. Sync Payroll Runs if available in localStorage
    if (typeof window !== 'undefined') {
      try {
        const storedRuns = window.localStorage.getItem('innov8it_runs_cache');
        if (storedRuns) {
          const runsList = JSON.parse(storedRuns);
          for (const r of runsList) {
            if (!isValidUUID(r.id) || !isValidUUID(r.payroll_period_id)) continue;
            if (
              ['00000000-0000-0000-0000-000000000051', '84b74bfb-d142-491e-8008-3e95aacd0f93', 'a1e71e27-2597-4bbb-8776-aa464196ec5a'].includes(r.id) ||
              ['PR-202609-01', 'RUN-202610-02', 'RUN-202610-03'].includes(r.run_number)
            ) {
              continue;
            }

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
