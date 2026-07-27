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
  return Array.from({ length: params.count }, (_, index) => cycleDate(params, index));
}

/** The last cycle's date — the scheme's effective end date. */
export function computeEndDate(params: ScheduleParams): Date {
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
