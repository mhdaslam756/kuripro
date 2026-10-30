import { addDays, addMonthsClamped } from "../../utils/date.js";
import { AppError } from "../../utils/app-error.js";
import type { ChitGroupFrequency } from "./chit-group.model.js";

/**
 * Fixed day-intervals for the sub-monthly frequencies. Monthly is handled separately with
 * calendar-month arithmetic (clamped) so a scheme starting on the 31st stays on month-ends rather
 * than drifting. Twice/thrice-monthly are modelled as even day-intervals within a ~30-day month.
 */
const INTERVAL_DAYS: Partial<Record<ChitGroupFrequency, number>> = {
  WEEKLY: 7,
  TWICE_MONTHLY: 15,
  THREE_TIMES_MONTHLY: 10,
};

export interface ScheduleParams {
  startDate: Date;
  frequency: ChitGroupFrequency;
  /** Number of cycles to schedule — equals totalMembers for a chit (everyone wins exactly once). */
  count: number;
  /** Required only when frequency is CUSTOM: the fixed number of days between cycles. */
  customIntervalDays?: number;
  /**
   * Fixed days of the month (1–31) on which cycles fall — MONTHLY takes 1, TWICE_MONTHLY 2,
   * THREE_TIMES_MONTHLY 3. Days past a month's end (30/31 in February) fall on its last day.
   * When omitted, the even-interval cadence above is used.
   */
  collectionDays?: number[];
}

/** Number of collection days each frequency expects, or undefined if it doesn't use them. */
export const COLLECTION_DAYS_REQUIRED: Partial<Record<ChitGroupFrequency, number>> = {
  MONTHLY: 1,
  TWICE_MONTHLY: 2,
  THREE_TIMES_MONTHLY: 3,
};

/** Cycle dates for fixed days-of-month: the first cycle is the first collection day on/after startDate. */
function collectionDayDates(startDate: Date, days: number[], count: number): Date[] {
  const sorted = [...new Set(days)].sort((a, b) => a - b);
  const dates: Date[] = [];

  for (let monthOffset = 0; dates.length < count; monthOffset += 1) {
    const first = new Date(startDate.getTime());
    first.setDate(1);
    first.setMonth(first.getMonth() + monthOffset);
    const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();

    // Clamp, then de-duplicate (30 and 31 both land on the 28th in a short February).
    const monthDays = [...new Set(sorted.map((day) => Math.min(day, daysInMonth)))];
    for (const day of monthDays) {
      if (monthOffset === 0 && day < startDate.getDate()) continue;
      if (dates.length >= count) break;
      const date = new Date(first.getTime());
      date.setDate(day);
      dates.push(date);
    }
  }
  return dates;
}

function usesCollectionDays(params: ScheduleParams): params is ScheduleParams & { collectionDays: number[] } {
  return (
    params.collectionDays !== undefined &&
    params.collectionDays.length > 0 &&
    COLLECTION_DAYS_REQUIRED[params.frequency] !== undefined
  );
}

/** Returns the scheduled date of cycle `index` (0-based) for the given cadence. */
function cycleDate(params: ScheduleParams, index: number): Date {
  const { startDate, frequency, customIntervalDays } = params;

  if (frequency === "MONTHLY") {
    return addMonthsClamped(startDate, index);
  }
  if (frequency === "CUSTOM") {
    if (!customIntervalDays || customIntervalDays < 1) {
      throw AppError.badRequest("customIntervalDays is required (and must be >= 1) for a CUSTOM frequency");
    }
    return addDays(startDate, index * customIntervalDays);
  }

  const interval = INTERVAL_DAYS[frequency];
  if (interval === undefined) {
    throw AppError.badRequest(`Unsupported frequency: ${frequency}`);
  }
  return addDays(startDate, index * interval);
}

/** The full ordered list of cycle dates for a scheme. */
export function computeScheduleDates(params: ScheduleParams): Date[] {
  if (usesCollectionDays(params)) return collectionDayDates(params.startDate, params.collectionDays, params.count);
  return Array.from({ length: params.count }, (_, index) => cycleDate(params, index));
}

/** The last cycle's date — the scheme's effective end date. */
export function computeEndDate(params: ScheduleParams): Date {
  if (usesCollectionDays(params)) return computeScheduleDates(params)[params.count - 1]!;
  return cycleDate(params, params.count - 1);
}

/** Human label for the cadence, used in summaries/UI (kept in sync with the frequency enum). */
export const FREQUENCY_LABELS: Record<ChitGroupFrequency, string> = {
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  TWICE_MONTHLY: "Twice monthly",
  THREE_TIMES_MONTHLY: "Three times monthly",
  CUSTOM: "Custom",
};
