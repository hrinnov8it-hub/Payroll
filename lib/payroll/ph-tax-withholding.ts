import { WithholdingTaxResult } from '@/types/payroll';
import { roundToTwoDecimals } from './calculate-rates';

/**
 * Philippine BIR Revised Withholding Tax Tables
 * In compliance with Republic Act No. 10963 (TRAIN Law) and RA 11976 (Ease of Paying Taxes Act).
 */

export interface TaxBracket {
  min: number;
  max: number;
  baseTax: number;
  rateOnExcess: number;
  label: string;
}

// Semi-Monthly Tax Table Brackets
export const SEMI_MONTHLY_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 10417, baseTax: 0, rateOnExcess: 0, label: 'Exempt (Below ₱10,417)' },
  { min: 10417, max: 16667, baseTax: 0, rateOnExcess: 0.15, label: '15% over ₱10,417' },
  { min: 16667, max: 33333, baseTax: 937.5, rateOnExcess: 0.2, label: '₱937.50 + 20% over ₱16,667' },
  { min: 33333, max: 83333, baseTax: 4270.7, rateOnExcess: 0.25, label: '₱4,270.70 + 25% over ₱33,333' },
  { min: 83333, max: 333333, baseTax: 16770.7, rateOnExcess: 0.3, label: '₱16,770.70 + 30% over ₱83,333' },
  { min: 333333, max: Infinity, baseTax: 91770.7, rateOnExcess: 0.35, label: '₱91,770.70 + 35% over ₱333,333' },
];

// Monthly Tax Table Brackets
export const MONTHLY_TAX_BRACKETS: TaxBracket[] = [
  { min: 0, max: 20833, baseTax: 0, rateOnExcess: 0, label: 'Exempt (Below ₱20,833)' },
  { min: 20833, max: 33333, baseTax: 0, rateOnExcess: 0.15, label: '15% over ₱20,833' },
  { min: 33333, max: 66667, baseTax: 1875.0, rateOnExcess: 0.2, label: '₱1,875 + 20% over ₱33,333' },
  { min: 66667, max: 166667, baseTax: 8541.67, rateOnExcess: 0.25, label: '₱8,541.67 + 25% over ₱66,667' },
  { min: 166667, max: 666667, baseTax: 33541.67, rateOnExcess: 0.3, label: '₱33,541.67 + 30% over ₱166,667' },
  { min: 666667, max: Infinity, baseTax: 183541.67, rateOnExcess: 0.35, label: '₱183,541.67 + 35% over ₱666,667' },
];

/**
 * Calculates Philippine BIR withholding tax based on taxable income and pay frequency
 */
export function calculateWithholdingTax(
  taxableIncome: number,
  isSemiMonthly = true
): WithholdingTaxResult {
  const income = Math.max(0, taxableIncome);
  const brackets = isSemiMonthly ? SEMI_MONTHLY_TAX_BRACKETS : MONTHLY_TAX_BRACKETS;

  // Find appropriate bracket
  let matchingBracket = brackets[0];
  for (const b of brackets) {
    if (income >= b.min) {
      matchingBracket = b;
    } else {
      break;
    }
  }

  if (matchingBracket.rateOnExcess === 0) {
    return {
      taxable_income: income,
      tax_bracket_label: matchingBracket.label,
      base_tax: 0,
      percentage_on_excess: 0,
      excess_amount: 0,
      tax_amount: 0,
    };
  }

  const excess = Math.max(0, income - matchingBracket.min);
  const taxOnExcess = excess * matchingBracket.rateOnExcess;
  const totalTax = roundToTwoDecimals(matchingBracket.baseTax + taxOnExcess);

  return {
    taxable_income: income,
    tax_bracket_label: matchingBracket.label,
    base_tax: matchingBracket.baseTax,
    percentage_on_excess: matchingBracket.rateOnExcess * 100,
    excess_amount: roundToTwoDecimals(excess),
    tax_amount: totalTax,
  };
}
