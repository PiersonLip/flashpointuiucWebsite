"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import {
  AvailabilityRange,
  addClubDays,
  buildAvailabilityDays,
  buildAvailabilitySlots,
  dayKey,
  formatAvailabilityLines,
  parseSlotKey,
  rangesToSlots,
  slotKeyOnDay,
  slotsToRanges,
  startOfLocalDay,
} from "@/lib/availability";
import { APP_TIMEZONE } from "@/lib/datetime";

const HORIZON_DAYS = 21;

export function AvailabilityGrid({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AvailabilityRange[];
  onChange: (ranges: AvailabilityRange[]) => void;
}) {
  const [windowSize, setWindowSize] = useState(7);
  const [startOffset, setStartOffset] = useState(0);
  const slots = useMemo(() => buildAvailabilitySlots(), []);
  const [selected, setSelected] = useState(() => rangesToSlots(value));
  const selectedRef = useRef(selected);
  selectedRef.current = selected;
  const painting = useRef(false);
  const paintMode = useRef<"add" | "remove">("add");
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 720px)");
    const apply = () => setWindowSize(mq.matches ? 3 : 7);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const maxOffset = Math.max(0, HORIZON_DAYS - windowSize);
  const clampedOffset = Math.min(startOffset, maxOffset);

  const rangeStart = useMemo(
    () => addClubDays(startOfLocalDay(), clampedOffset),
    [clampedOffset],
  );

  const days = useMemo(
    () => buildAvailabilityDays(windowSize, rangeStart),
    [windowSize, rangeStart],
  );

  const valueSig = JSON.stringify(value);
  useEffect(() => {
    // Don't clobber in-progress paint from a stale parent value mid-gesture
    if (painting.current) return;
    setSelected(rangesToSlots(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when parent value changes
  }, [valueSig]);

  useEffect(() => {
    if (startOffset > maxOffset) setStartOffset(maxOffset);
  }, [startOffset, maxOffset]);

  const publish = useCallback(
    (next: Set<string>) => {
      onChange(slotsToRanges(next));
    },
    [onChange],
  );

  const commitLocal = useCallback((next: Set<string>) => {
    selectedRef.current = next;
    setSelected(next);
  }, []);

  function applyKey(key: string) {
    if (parseSlotKey(key) < new Date()) return;
    const next = new Set(selectedRef.current);
    if (paintMode.current === "add") next.add(key);
    else next.delete(key);
    commitLocal(next);
  }

  function onPointerDown(
    e: PointerEvent<HTMLButtonElement>,
    day: Date,
    hour: number,
    minute: number,
  ) {
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    painting.current = true;
    const key = slotKeyOnDay(day, hour, minute);
    paintMode.current = selectedRef.current.has(key) ? "remove" : "add";
    applyKey(key);
  }

  function onPointerEnter(day: Date, hour: number, minute: number) {
    if (!painting.current) return;
    applyKey(slotKeyOnDay(day, hour, minute));
  }

  function onGridPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!painting.current) return;
    const el = document.elementFromPoint(e.clientX, e.clientY);
    const btn = el?.closest?.("button[data-slot]") as HTMLButtonElement | null;
    const key = btn?.dataset.slot;
    if (key) applyKey(key);
  }

  function endPaint() {
    if (!painting.current) return;
    painting.current = false;
    publish(selectedRef.current);
  }

  function clearAll() {
    painting.current = false;
    const empty = new Set<string>();
    commitLocal(empty);
    publish(empty);
  }

  const rangeLabel = `${days[0].toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  })} – ${days[days.length - 1].toLocaleDateString("en-US", {
    timeZone: APP_TIMEZONE,
    month: "short",
    day: "numeric",
  })}`;

  const lines = formatAvailabilityLines(slotsToRanges(selected));

  return (
    <div className="avail">
      <div className="avail-head">
        <span className="label" style={{ margin: 0 }}>
          {label}
        </span>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ padding: "0.35rem 0.65rem", fontSize: "0.85rem" }}
          onClick={clearAll}
        >
          Clear
        </button>
      </div>

      <div className="avail-nav">
        <button
          type="button"
          className="btn btn-ghost"
          disabled={clampedOffset <= 0}
          onClick={() => setStartOffset((o) => Math.max(0, o - windowSize))}
        >
          ← Prev
        </button>
        <span className="avail-nav-label">{rangeLabel}</span>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={clampedOffset >= maxOffset}
          onClick={() => setStartOffset((o) => Math.min(maxOffset, o + windowSize))}
        >
          Next →
        </button>
      </div>

      <div
        ref={gridRef}
        className="avail-scroll"
        onPointerUp={endPaint}
        onPointerCancel={endPaint}
        onPointerLeave={endPaint}
        onPointerMove={onGridPointerMove}
      >
        <table className="avail-grid">
          <thead>
            <tr>
              <th className="avail-time-col" />
              {days.map((d) => (
                <th key={dayKey(d)}>
                  <div className="avail-day-name">
                    {d.toLocaleDateString("en-US", {
                      timeZone: APP_TIMEZONE,
                      weekday: "short",
                    })}
                  </div>
                  <div className="avail-day-num">
                    {d.toLocaleDateString("en-US", {
                      timeZone: APP_TIMEZONE,
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot) => (
              <tr key={`${slot.hour}:${slot.minute}`}>
                <th className="avail-time-col">
                  {slot.minute === 0 ? slot.label : ""}
                </th>
                {days.map((d) => {
                  const key = slotKeyOnDay(d, slot.hour, slot.minute);
                  const on = selected.has(key);
                  const past = parseSlotKey(key) < new Date();
                  return (
                    <td key={key}>
                      <button
                        type="button"
                        data-slot={key}
                        className={`avail-cell${on ? " is-on" : ""}${past ? " is-past" : ""}`}
                        disabled={past}
                        aria-pressed={on}
                        aria-label={`${d.toLocaleDateString("en-US", {
                          timeZone: APP_TIMEZONE,
                        })} ${slot.label}`}
                        onPointerDown={(e) => onPointerDown(e, d, slot.hour, slot.minute)}
                        onPointerEnter={() => onPointerEnter(d, slot.hour, slot.minute)}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lines.length ? (
        <ul className="avail-summary">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function AvailabilityReadout({
  label,
  ranges,
}: {
  label: string;
  ranges: AvailabilityRange[];
}) {
  const lines = formatAvailabilityLines(ranges);
  if (!lines.length) return null;
  return (
    <div style={{ fontSize: "0.85rem" }}>
      <div className="muted">{label}</div>
      {lines.map((line) => (
        <div key={line}>{line}</div>
      ))}
    </div>
  );
}
