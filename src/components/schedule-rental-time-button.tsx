"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AvailabilityGrid } from "@/components/availability-grid";
import type { AvailabilityRange } from "@/lib/availability";
import { parseAvailability } from "@/lib/availability";

export function ScheduleRentalTimeButton({
  rentalId,
  kind,
  initialAvailability,
  gearName,
}: {
  rentalId: string;
  kind: "pickup" | "return";
  initialAvailability?: AvailabilityRange[] | null;
  gearName: string;
}) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availability, setAvailability] = useState<AvailabilityRange[]>(() =>
    parseAvailability(initialAvailability),
  );

  const label = kind === "pickup" ? "Schedule pickup" : "Schedule return";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function openModal() {
    setAvailability(parseAvailability(initialAvailability));
    setError(null);
    setOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "schedule",
          rentalId,
          kind,
          availability,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to save");
      setOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className="rental-app modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div
              className="modal modal-wide rise"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              <form className="stack" onSubmit={onSubmit}>
                <div>
                  <p
                    className="muted"
                    style={{
                      margin: 0,
                      fontSize: "0.78rem",
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                    }}
                  >
                    {label}
                  </p>
                  <h2
                    id={titleId}
                    className="brand"
                    style={{ fontSize: "1.85rem", margin: "0.3rem 0 0", lineHeight: 1.15 }}
                  >
                    {gearName}
                  </h2>
                </div>

                <AvailabilityGrid
                  label={`${kind === "pickup" ? "Pickup" : "Return"} availability`}
                  value={availability}
                  onChange={setAvailability}
                />

                {error ? <p className="error">{error}</p> : null}

                <div className="modal-actions">
                  <button className="btn btn-primary" type="submit" disabled={pending}>
                    {pending ? "Saving…" : "Save"}
                  </button>
                  <button
                    className="btn btn-ghost"
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={pending}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className="btn btn-ghost" onClick={openModal}>
        {label}
      </button>
      {dialog}
    </>
  );
}
