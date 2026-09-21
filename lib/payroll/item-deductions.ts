import { calculateSSSContribution } from './ph-statutory-sss';
import { calculatePhilHealthContribution } from './ph-statutory-philhealth';
import { calculatePagIbigContribution } from './ph-statutory-pagibig';

export interface ItemizedDeductions {
  // Attendance-based Deductions
  late: { minutes: number; amount: number };
  undertime: { minutes: number; amount: number };
  absence: { days: number; amount: number };
  attendanceTotal: number;

  // Mandatory Statutory Employee Deductions
  sss: {
    amount: number;
    msc?: number;
    regularEE?: number;
    wispEE?: number;
  };
  philhealth: {
    amount: number;
  };
  pagibig: {
    amount: number;
  };
  tax: {
    amount: number;
  };
  statutoryTotal: number;

  // Mandatory Statutory Employer Contributions (Informational / Company cost)
  employerContributions: {
    sssER: number;
    philhealthER: number;
    pagibigER: number;
    total: number;
  };

  // Other Deductions / Loans
  other: {
    amount: number;
    list: Array<{ name: string; amount: number; code?: string }>;
  };

  totalDeductions: number;
}

/**
 * Extracts, itemizes, and verifies all deductions (attendance, mandatory government benefits, loans/other)
 * from any PayrollRunItem, Payslip, or snapshot object.
 */
export function getItemizedDeductions(item: any): ItemizedDeductions {
  if (!item) {
    return {
      late: { minutes: 0, amount: 0 },
      undertime: { minutes: 0, amount: 0 },
      absence: { days: 0, amount: 0 },
      attendanceTotal: 0,
      sss: { amount: 0 },
      philhealth: { amount: 0 },
      pagibig: { amount: 0 },
      tax: { amount: 0 },
      statutoryTotal: 0,
      employerContributions: { sssER: 0, philhealthER: 0, pagibigER: 0, total: 0 },
      other: { amount: 0, list: [] },
      totalDeductions: 0,
    };
  }

  // 1. Attendance Deductions
  const lateMins = Number(item.late_minutes || 0);
  const lateAmt = Number(item.late_deduction || 0);
  const undertimeMins = Number(item.undertime_minutes || 0);
  const undertimeAmt = Number(item.undertime_deduction || 0);
  const absentDays = Number(item.absent_days || 0);
  const absentAmt = Number(item.absence_deduction || 0);
  const attendanceTotal = Math.round((lateAmt + undertimeAmt + absentAmt) * 100) / 100;

  // 2. Parse Breakdown Object if stored
  let breakdown: any = {};
  if (typeof item.item_breakdown === 'string') {
    try {
      breakdown = JSON.parse(item.item_breakdown);
    } catch {
      breakdown = {};
    }
  } else if (item.item_breakdown && typeof item.item_breakdown === 'object') {
    breakdown = item.item_breakdown;
  }

  const stat = breakdown?.statutory_deductions;

  // 3. Extract Initial Statutory Values
  let sssAmt = Number(
    item.sss_deduction ??
    stat?.sss?.total_employee_cutoff ??
    0
  );
  let regularEE = stat?.sss?.regular_ss_employee;
  let wispEE = stat?.sss?.wisp_employee;
  let msc = stat?.sss?.monthly_salary_credit;

  let phicAmt = Number(
    item.philhealth_deduction ??
    stat?.philhealth?.employee_cutoff ??
    0
  );

  let hdmfAmt = Number(
    item.pagibig_deduction ??
    stat?.pagibig?.employee_cutoff ??
    0
  );

  let taxAmt = Number(
    item.tax_deduction ??
    stat?.withholding_tax?.tax_amount ??
    0
  );

  let sssER = Number(stat?.sss?.total_employer_cutoff ?? 0);
  let phicER = Number(stat?.philhealth?.employer_cutoff ?? 0);
  let hdmfER = Number(stat?.pagibig?.employer_cutoff ?? 0);
  let erTotal = Number(
    item.employer_contributions ??
    stat?.total_employer_contributions ??
    (sssER + phicER + hdmfER)
  );

  // 4. Other Deductions & Statutory Deductions from other_deductions_list fallback
  const rawOtherList: Array<{ name: string; amount: number; code?: string }> =
    item.other_deductions_list ||
    breakdown?.other_deductions_list ||
    [];

  const statutoryCodes = ['SSS-CONTRIB', 'PHIC-CONTRIB', 'HDMF-CONTRIB', 'W-TAX', 'SSS', 'PHIC', 'HDMF', 'TAX'];
  const filteredOtherList: Array<{ name: string; amount: number; code?: string }> = [];

  rawOtherList.forEach((entry) => {
    const code = (entry.code || '').toUpperCase();
    if (code === 'SSS-CONTRIB' || code === 'SSS') {
      if (sssAmt === 0) sssAmt = Number(entry.amount || 0);
    } else if (code === 'PHIC-CONTRIB' || code === 'PHIC' || code === 'PHILHEALTH') {
      if (phicAmt === 0) phicAmt = Number(entry.amount || 0);
    } else if (code === 'HDMF-CONTRIB' || code === 'HDMF' || code === 'PAGIBIG') {
      if (hdmfAmt === 0) hdmfAmt = Number(entry.amount || 0);
    } else if (code === 'W-TAX' || code === 'TAX') {
      if (taxAmt === 0) taxAmt = Number(entry.amount || 0);
    } else if (!statutoryCodes.includes(code)) {
      filteredOtherList.push(entry);
    }
  });

  let otherAmt = filteredOtherList.length > 0
    ? filteredOtherList.reduce((sum, d) => sum + Number(d.amount || 0), 0)
    : Number(item.other_deductions || 0);

  // 5. Fallback Calculation if statutory amounts are 0 but total_deductions accounts for them
  const currentTotalDeductions = Number(item.total_deductions || 0);
  const unaccounted = Math.round((currentTotalDeductions - attendanceTotal - otherAmt) * 100) / 100;

  if (sssAmt === 0 && phicAmt === 0 && hdmfAmt === 0 && unaccounted > 0) {
    const salary = Number(item.basic_salary_snapshot || item.basic_salary || 0);
    const payType = String(item.pay_type_snapshot || item.pay_type || 'monthly').toLowerCase();

    let monthlySalary = salary;
    if (payType === 'daily') {
      monthlySalary = (salary * 261) / 12;
    } else if (payType === 'hourly') {
      monthlySalary = (salary * 8 * 261) / 12;
    }

    if (monthlySalary > 0) {
      const sssCalc = calculateSSSContribution(monthlySalary, true);
      const phicCalc = calculatePhilHealthContribution(monthlySalary, true);
      const hdmfCalc = calculatePagIbigContribution(monthlySalary, true);

      sssAmt = sssCalc.total_employee_cutoff;
      regularEE = sssCalc.regular_ss_employee;
      wispEE = sssCalc.wisp_employee;
      msc = sssCalc.monthly_salary_credit;
      sssER = sssCalc.total_employer_cutoff;

      phicAmt = phicCalc.employee_cutoff;
      phicER = phicCalc.employer_cutoff;

      hdmfAmt = hdmfCalc.employee_cutoff;
      hdmfER = hdmfCalc.employer_cutoff;
      erTotal = sssER + phicER + hdmfER;

      const statSum = Math.round((sssAmt + phicAmt + hdmfAmt) * 100) / 100;
      if (unaccounted > statSum) {
        taxAmt = Math.round((unaccounted - statSum) * 100) / 100;
      }
    }
  }

  const statutoryTotal = Math.round((sssAmt + phicAmt + hdmfAmt + taxAmt) * 100) / 100;
  const finalTotalDeductions = currentTotalDeductions > 0
    ? currentTotalDeductions
    : Math.round((attendanceTotal + statutoryTotal + otherAmt) * 100) / 100;

  return {
    late: { minutes: lateMins, amount: lateAmt },
    undertime: { minutes: undertimeMins, amount: undertimeAmt },
    absence: { days: absentDays, amount: absentAmt },
    attendanceTotal,
    sss: {
      amount: sssAmt,
      msc,
      regularEE,
      wispEE,
    },
    philhealth: {
      amount: phicAmt,
    },
    pagibig: {
      amount: hdmfAmt,
    },
    tax: {
      amount: taxAmt,
    },
    statutoryTotal,
    employerContributions: {
      sssER,
      philhealthER: phicER,
      pagibigER: hdmfER,
      total: erTotal,
    },
    other: {
      amount: otherAmt,
      list: filteredOtherList,
    },
    totalDeductions: finalTotalDeductions,
  };
}
