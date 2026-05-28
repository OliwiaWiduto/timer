import { format, intervalToDuration } from "date-fns";

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return [h, m, sec].map((n) => String(n).padStart(2, "0")).join(":");
}

export function formatHoursMinutes(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy h:mm a");
}

export function formatShortDate(iso: string): string {
  return format(new Date(iso), "MMM d, yyyy");
}

export function humanizeDuration(seconds: number): string {
  const d = intervalToDuration({ start: 0, end: seconds * 1000 });
  const parts: string[] = [];
  if (d.hours) parts.push(`${d.hours}h`);
  if (d.minutes) parts.push(`${d.minutes}m`);
  if (!parts.length || d.seconds) parts.push(`${d.seconds ?? 0}s`);
  return parts.join(" ") || "0s";
}

export function formatMoney(amount: number, currency: string): string {
  const code = !currency || currency === "USD" ? "GBP" : currency;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: code,
    }).format(amount);
  } catch {
    return `£${amount.toFixed(2)}`;
  }
}
