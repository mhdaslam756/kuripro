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
/** How many collection days each frequency expects (mirrors the backend). */
export const COLLECTION_DAYS_REQUIRED: Partial<Record<ChitGroupFrequency, number>> = {
  MONTHLY: 1,
  TWICE_MONTHLY: 2,
  THREE_TIMES_MONTHLY: 3,
};

/** Cycle dates for fixed days-of-month; first cycle is the first collection day on/after startDate. */
export function previewCollectionDates(startDate: Date, days: number[], count: number): Date[] {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const dates: Date[] = [];
  if (sorted.length === 0) return dates;
  for (let m = 0; dates.length < count; m += 1) {
    const first = new Date(startDate.getTime());
    first.setDate(1);
    first.setMonth(first.getMonth() + m);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
    for (const day of new Set(sorted.map((d) => Math.min(d, daysInMonth)))) {
      if (m === 0 && day < startDate.getDate()) continue;
      if (dates.length >= count) break;
      const date = new Date(first.getTime());
      date.setDate(day);
      dates.push(date);
    }
  }
  return dates;
}

export function previewEndDate(
  startDate: Date,
  frequency: ChitGroupFrequency,
  count: number,
  customIntervalDays?: number,
  collectionDays?: number[],
): Date | null {
  if (count < 1) return null;
  if (collectionDays && collectionDays.length === COLLECTION_DAYS_REQUIRED[frequency]) {
    return previewCollectionDates(startDate, collectionDays, count)[count - 1] ?? null;
  }
  const lastIndex = count - 1;
  if (frequency === "MONTHLY") return addMonthsClamped(startDate, lastIndex);
  if (frequency === "CUSTOM") {
    if (!customIntervalDays || customIntervalDays < 1) return null;
    return addDays(startDate, lastIndex * customIntervalDays);
  }
  const interval = INTERVAL_DAYS[frequency];
  return interval === undefined ? null : addDays(startDate, lastIndex * interval);
}
