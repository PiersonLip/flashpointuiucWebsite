/** Contiguous availability window (ISO timestamps). Wall-clock times are America/Chicago. */
import { APP_TIMEZONE } from "@/lib/datetime";

export type AvailabilityRange = {
  start: string;
  end: string;
};

export const AVAILABILITY_SLOT_MINUTES = 30;
export const AVAILABILITY_DAY_COUNT = 14;
export const AVAILABILITY_HOUR_START = 8;
export const AVAILABILITY_HOUR_END = 22;

function pad(n: number) {
  return String(n).padStart(2, "0");
}

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

export function getZonedParts(date: Date, timeZone = APP_TIMEZONE): ZonedParts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = Object.fromEntries(
    fmt
      .formatToParts(date)
      .filter((p) => p.type !== "literal")
      .map((p) => [p.type, p.value]),
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Interpret a club wall-clock time as a UTC Instant. */
export function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second = 0,
  timeZone = APP_TIMEZONE,
): Date {
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  const parts = getZonedParts(new Date(utcGuess), timeZone);
  const asWall = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );
  const desiredAsUtc = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  return new Date(utcGuess - (asWall - desiredAsUtc));
}

/** Club calendar day key YYYY-MM-DD */
export function dayKey(d: Date) {
  const p = getZonedParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Club slot key YYYY-MM-DDTHH:MM (America/Chicago wall clock) */
export function slotKey(d: Date) {
  const p = getZonedParts(d);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

/** Slot key for a club calendar day at the given wall-clock hour/minute. */
export function slotKeyOnDay(day: Date, hour: number, minute: number) {
  const p = getZonedParts(day);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(hour)}:${pad(minute)}`;
}

export function parseSlotKey(key: string): Date {
  const [datePart, timePart] = key.split("T");
  const [y, m, day] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  return zonedTimeToUtc(y, m, day, hh, mm);
}

/** Add calendar days in the club timezone (DST-safe). */
export function addClubDays(d: Date, days: number) {
  const p = getZonedParts(d);
  return zonedTimeToUtc(p.year, p.month, p.day + days, 12, 0);
}

export function startOfLocalDay(d = new Date()) {
  const p = getZonedParts(d);
  return zonedTimeToUtc(p.year, p.month, p.day, 0, 0);
}

export function buildAvailabilityDays(count = AVAILABILITY_DAY_COUNT, from = new Date()) {
  const start = startOfLocalDay(from);
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    days.push(addClubDays(start, i));
  }
  return days;
}

export function buildAvailabilitySlots(
  hourStart = AVAILABILITY_HOUR_START,
  hourEnd = AVAILABILITY_HOUR_END,
  slotMinutes = AVAILABILITY_SLOT_MINUTES,
) {
  const slots: { hour: number; minute: number; label: string }[] = [];
  for (let mins = hourStart * 60; mins < hourEnd * 60; mins += slotMinutes) {
    const hour = Math.floor(mins / 60);
    const minute = mins % 60;
    const labelDate = zonedTimeToUtc(2000, 1, 1, hour, minute);
    slots.push({
      hour,
      minute,
      label: labelDate.toLocaleTimeString("en-US", {
        timeZone: APP_TIMEZONE,
        hour: "numeric",
        minute: minute === 0 ? undefined : "2-digit",
      }),
    });
  }
  return slots;
}

/** Merge selected half-hour slots into contiguous ISO ranges. */
export function slotsToRanges(
  selected: Iterable<string>,
  slotMinutes = AVAILABILITY_SLOT_MINUTES,
): AvailabilityRange[] {
  const keys = [...selected].sort();
  if (!keys.length) return [];

  const ranges: AvailabilityRange[] = [];
  let rangeStart = keys[0];
  let prev = keys[0];

  for (let i = 1; i < keys.length; i++) {
    const cur = keys[i];
    const prevEnd = parseSlotKey(prev);
    prevEnd.setUTCMinutes(prevEnd.getUTCMinutes() + slotMinutes);
    if (slotKey(prevEnd) === cur) {
      prev = cur;
      continue;
    }
    const end = parseSlotKey(prev);
    end.setUTCMinutes(end.getUTCMinutes() + slotMinutes);
    ranges.push({ start: parseSlotKey(rangeStart).toISOString(), end: end.toISOString() });
    rangeStart = cur;
    prev = cur;
  }

  const end = parseSlotKey(prev);
  end.setUTCMinutes(end.getUTCMinutes() + slotMinutes);
  ranges.push({ start: parseSlotKey(rangeStart).toISOString(), end: end.toISOString() });
  return ranges;
}

/** Expand ranges back into slot keys for the grid. */
export function rangesToSlots(
  ranges: AvailabilityRange[],
  slotMinutes = AVAILABILITY_SLOT_MINUTES,
): Set<string> {
  const out = new Set<string>();
  for (const range of ranges) {
    const start = new Date(range.start);
    const end = new Date(range.end);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) continue;
    const cursor = new Date(start);
    while (cursor < end) {
      out.add(slotKey(cursor));
      cursor.setUTCMinutes(cursor.getUTCMinutes() + slotMinutes);
    }
  }
  return out;
}

export function parseAvailability(raw: unknown): AvailabilityRange[] {
  if (!Array.isArray(raw)) return [];
  const out: AvailabilityRange[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const start = String((item as AvailabilityRange).start ?? "");
    const end = String((item as AvailabilityRange).end ?? "");
    const s = new Date(start);
    const e = new Date(end);
    if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime()) || e <= s) continue;
    out.push({ start: s.toISOString(), end: e.toISOString() });
  }
  return out.sort((a, b) => a.start.localeCompare(b.start));
}

export function earliestStart(ranges: AvailabilityRange[]): Date | null {
  if (!ranges.length) return null;
  return new Date(ranges[0].start);
}

export function latestEnd(ranges: AvailabilityRange[]): Date | null {
  if (!ranges.length) return null;
  return new Date(
    ranges.reduce((max, r) => (r.end > max ? r.end : max), ranges[0].end),
  );
}

export function validateAvailabilityPair(
  pickup: AvailabilityRange[],
  ret: AvailabilityRange[],
) {
  if (!pickup.length) throw new Error("Select at least one pickup time window");
  if (!ret.length) throw new Error("Select at least one return time window");
  const p = earliestStart(pickup)!;
  const r = earliestStart(ret)!;
  if (r <= p) {
    throw new Error("Return availability must start after your earliest pickup window");
  }
}

export function rentalDaysFromAvailability(
  pickup: AvailabilityRange[],
  ret: AvailabilityRange[],
) {
  const p = earliestStart(pickup);
  const r = earliestStart(ret);
  if (!p || !r) return 7;
  const ms = r.getTime() - p.getTime();
  return Math.min(60, Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24))));
}

export function formatAvailabilityRange(range: AvailabilityRange) {
  const start = new Date(range.start);
  const end = new Date(range.end);
  const day = start.toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const t0 = start.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
  const t1 = end.toLocaleTimeString("en-US", {
    timeZone: APP_TIMEZONE,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day}, ${t0}–${t1}`;
}

export function formatAvailabilityList(ranges: AvailabilityRange[]) {
  if (!ranges.length) return "—";
  return ranges.map(formatAvailabilityRange).join("; ");
}

export function formatAvailabilityLines(ranges: AvailabilityRange[]) {
  return ranges.map(formatAvailabilityRange);
}
