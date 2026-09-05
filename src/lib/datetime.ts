/** Club timezone — use for all user-facing dates (emails + UI). */
export const APP_TIMEZONE = "America/Chicago";

export function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", { timeZone: APP_TIMEZONE });
}

export function formatDateTime(date: Date) {
  return date.toLocaleString("en-US", { timeZone: APP_TIMEZONE });
}
