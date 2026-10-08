export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
];

/** "just now", "5 minutes ago", "yesterday", ... */
export function formatRelativeTime(date: string | Date) {
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) {
      return relativeTime.format(Math.round(seconds / size), unit);
    }
  }
  return "just now";
}

/** "₹1,234.50" with a known currency, "1,234.50" without one. */
export function formatMoney(amount: number, currency: string | null) {
  if (currency) {
    try {
      return new Intl.NumberFormat("en", { style: "currency", currency }).format(
        amount,
      );
    } catch {
      // Not a currency Intl knows; fall through to a plain number.
    }
  }
  return new Intl.NumberFormat("en", { minimumFractionDigits: 2 }).format(amount);
}

const dateFormat = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

/** A calendar date like "2026-10-08" as "Oct 8, 2026", without timezone shifts. */
export function formatDate(date: string) {
  return dateFormat.format(new Date(`${date}T00:00:00Z`));
}
