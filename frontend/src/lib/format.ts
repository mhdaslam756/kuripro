const INR = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

/** Formats an integer-paise amount as Indian Rupees. Money always crosses the wire as paise. */
export function formatPaise(paise: number | undefined): string {
  if (paise === undefined) return "—";
  return INR.format(paise / 100);
}

const DATE = new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const DATE_TIME = new Intl.DateTimeFormat("en-IN", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | undefined): string {
  if (!value) return "—";
  return DATE.format(new Date(value));
}

export function formatDateTime(value: string | undefined): string {
  if (!value) return "—";
  return DATE_TIME.format(new Date(value));
}

/** Turns an UPPER_SNAKE enum value into Title Case for display. */
export function humanize(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
