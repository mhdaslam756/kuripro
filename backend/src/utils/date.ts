/**
 * Adds `months` calendar months to `date`, clamping to the last valid day of the target month
 * (e.g. Jan 31 + 1 month = Feb 28/29, not the native `Date` rollover to Mar 2/3). Used to
 * generate a chit group's monthly cycle schedule from its start date.
 */
export function addMonthsClamped(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const targetMonth = result.getMonth() + months;

  result.setDate(1);
  result.setMonth(targetMonth);

  const daysInTargetMonth = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), daysInTargetMonth));

  return result;
}

/** Adds `days` calendar days to `date`. Used for weekly/twice-monthly/custom cycle scheduling. */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date.getTime());
  result.setDate(result.getDate() + days);
  return result;
}
