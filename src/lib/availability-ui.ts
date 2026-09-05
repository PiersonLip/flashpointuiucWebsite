import type { AvailabilityRange } from "@/lib/availability";
import { parseAvailability } from "@/lib/availability";

/** Prefer JSON windows; fall back to a 1-hour window from a legacy single timestamp. */
export function coerceAvailability(
  raw: unknown,
  fallbackAt?: Date | string | null,
): AvailabilityRange[] {
  const parsed = parseAvailability(raw);
  if (parsed.length) return parsed;
  if (!fallbackAt) return [];
  const start = new Date(fallbackAt);
  if (Number.isNaN(start.getTime())) return [];
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  return [{ start: start.toISOString(), end: end.toISOString() }];
}
