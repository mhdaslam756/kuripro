import { AppError } from "./app-error.js";

/**
 * All monetary amounts in this codebase are stored and passed around as integer paise
 * (1 rupee = 100 paise). This avoids floating-point rounding errors in ledger arithmetic.
 * Convert to/from rupees only at the API boundary (request parsing / response formatting).
 */

const INR_FORMATTER = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function assertIntegerPaise(paise: number, fieldName = "amount"): void {
  if (!Number.isInteger(paise) || paise < 0) {
    throw AppError.badRequest(`${fieldName} must be a non-negative integer number of paise`);
  }
}

export function rupeesToPaise(rupees: number): number {
  if (!Number.isFinite(rupees) || rupees < 0) {
    throw AppError.badRequest("Amount must be a non-negative finite number");
  }
  const paise = Math.round(rupees * 100);
  return paise;
}

export function paiseToRupees(paise: number): number {
  assertIntegerPaise(paise);
  return paise / 100;
}

export function formatPaiseAsINR(paise: number): string {
  assertIntegerPaise(paise);
  return INR_FORMATTER.format(paise / 100);
}

/**
 * Computes `percent`% of `paise`, rounded to the nearest whole paisa (round-half-up).
 * Used for commission, dividend, and statutory bid-cap calculations.
 */
export function percentageOfPaise(paise: number, percent: number): number {
  assertIntegerPaise(paise);
  if (!Number.isFinite(percent) || percent < 0) {
    throw AppError.badRequest("Percent must be a non-negative finite number");
  }
  return Math.round((paise * percent) / 100);
}

export function sumPaise(...amounts: number[]): number {
  return amounts.reduce((total, amount) => {
    assertIntegerPaise(amount);
    return total + amount;
  }, 0);
}
