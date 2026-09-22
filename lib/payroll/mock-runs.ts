import { PayrollRunWithItems, PayrollRunItem } from '@/types/payroll';
import { fallbackEmployees } from '@/lib/employees/mock-data';
import { fallbackPayrollPeriods, fallbackAttendanceRecords } from '@/lib/attendance/mock-attendance';
import { calculatePayroll } from './engine';
import { roundToTwoDecimals } from './calculate-rates';

function createSeedRunItems(periodId: string, runId: string): PayrollRunItem[] {
  const periodAttendance = fallbackAttendanceRecords.filter((a) => a.payroll_period_id === periodId);
  const attendanceMap = new Map(periodAttendance.map((a) => [a.employee_id, a]));

  return fallbackEmployees.map((emp, index) => {
    const att = attendanceMap.get(emp.id) || {
      days_worked: 11,
      regular_hours: 88,
      overtime_hours: 0,
      night_diff_hours: 0,
      late_minutes: 0,
      undertime_minutes: 0,
      absent_days: 0,
      holiday_regular_hours: 0,
      holiday_special_hours: 0,
      rest_day_hours: 0,
    };

    const calc = calculatePayroll({
      employee: {
        id: emp.id,
        employee_number: emp.employee_number,
        first_name: emp.first_name,
        last_name: emp.last_name,
        basic_salary: emp.basic_salary,
        hourly_rate: emp.hourly_rate,
        pay_type: emp.pay_type,
        department_name: emp.department?.name,
        position_title: emp.position?.title,
      },
      attendance: {
        days_worked: att.days_worked,
        regular_hours: att.regular_hours,
        overtime_hours: att.overtime_hours,
        night_diff_hours: att.night_diff_hours,
        late_minutes: att.late_minutes,
        undertime_minutes: att.undertime_minutes,
        absent_days: att.absent_days,
        holiday_regular_hours: att.holiday_regular_hours,
        holiday_special_hours: att.holiday_special_hours,
        rest_day_hours: att.rest_day_hours,
      },
      includeStatutory: true,
    });

    const itemId = `item-seed-${(index + 1).toString().padStart(3, '0')}`;

    return {
      id: itemId,
      payroll_run_id: runId,
      employee_id: emp.id,
      employee_name_snapshot: `${emp.first_name} ${emp.last_name}`,
      employee_number_snapshot: emp.employee_number,
      department_snapshot: emp.department?.name || 'Engineering',
      position_snapshot: emp.position?.title || 'Staff',
      basic_salary_snapshot: emp.basic_salary,
      hourly_rate_snapshot: emp.hourly_rate,
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
      created_at: '2026-09-15T00:00:00.000Z',
      updated_at: '2026-09-15T00:00:00.000Z',
    };
  });
}

const seedRunId = '00000000-0000-0000-0000-000000000051';
const seedItems = createSeedRunItems('00000000-0000-0000-0000-000000000001', seedRunId);

const totalGross = roundToTwoDecimals(seedItems.reduce((acc, it) => acc + it.gross_pay, 0));
const totalDeduct = roundToTwoDecimals(seedItems.reduce((acc, it) => acc + it.total_deductions, 0));
const totalNet = roundToTwoDecimals(seedItems.reduce((acc, it) => acc + it.net_pay, 0));

export const fallbackPayrollRuns: PayrollRunWithItems[] = [
  {
    id: seedRunId,
    payroll_period_id: '00000000-0000-0000-0000-000000000001',
    run_number: 'PR-202609-01',
    status: 'approved',
    total_employees: seedItems.length,
    total_gross_pay: totalGross,
    total_deductions: totalDeduct,
    total_net_pay: totalNet,
    notes: 'Regular semi-monthly payroll for Sep 1-15, 2026 approved and processed.',
    processed_by: 'hr.innov8it@gmail.com',
    processed_at: '2026-09-15T08:00:00.000Z',
    created_at: '2026-09-15T00:00:00.000Z',
    updated_at: '2026-09-15T08:30:00.000Z',
    payroll_period: fallbackPayrollPeriods[0],
    items: seedItems,
  },
];
