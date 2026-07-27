import type { ChitGroupFrequency } from "./types";

const INTERVAL_DAYS: Partial<Record<ChitGroupFrequency, number>> = {
  WEEKLY: 7,
  TWICE_MONTHLY: 15,
  THREE_TIMES_MONTHLY: 10,
};

function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}

function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const daysInMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), daysInMonth));
  return result;
}

/**
 * Client-side mirror of the backend `chit-schedule` util, used purely for a live preview in the
 * create form (end date / duration). The server remains the source of truth on save.
 */
export function previewEndDate(
  startDate: Date,
  frequency: ChitGroupFrequency,
  count: number,
  customIntervalDays?: number,
): Date | null {
  if (count < 1) return null;
  const lastIndex = count - 1;
  if (frequency === "MONTHLY") return addMonthsClamped(startDate, lastIndex);
  if (frequency === "CUSTOM") {
    if (!customIntervalDays || customIntervalDays < 1) return null;
    return addDays(startDate, lastIndex * customIntervalDays);
  }
  const interval = INTERVAL_DAYS[frequency];
  return interval === undefined ? null : addDays(startDate, lastIndex * interval);
}
