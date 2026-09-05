"use client";

import { FormEvent, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { AvailabilityGrid } from "@/components/availability-grid";
import type { AvailabilityRange } from "@/lib/availability";

export function RequestGearButton({
  equipmentId,
  equipmentName,
  mode = "request",
  offerExpiresAt,
}: {
  equipmentId: string;
  equipmentName: string;
  mode?: "request" | "waitlist-confirm";
  offerExpiresAt?: string | null;
}) {
  const router = useRouter();
  const titleId = useId();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pickupAvailability, setPickupAvailability] = useState<AvailabilityRange[]>([]);
  const isWaitlist = mode === "waitlist-confirm";
  const buttonLabel = isWaitlist ? "Confirm waitlist request" : "Request";
  const thankYou = isWaitlist
    ? "Thanks — your waitlist claim is in. A manager will be in touch to coordinate pickup."
    : "A manager will be in touch with you shortly to coordinate pickup.";

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const renterNotes = String(fd.get("renterNotes") ?? "");
    const needsTraining = fd.get("needsTraining") === "on";

    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "request",
          equipmentId,
          pickupAvailability,
          renterNotes,
          needsTraining,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  function close() {
    const shouldRefresh = done;
    setOpen(false);
    setDone(false);
    setError(null);
    if (shouldRefresh) router.refresh();
  }

  function openModal() {
    setPickupAvailability([]);
    setDone(false);
    setError(null);
    setOpen(true);
  }

  const dialog =
    open && mounted
      ? createPortal(
          <div
            className="rental-app modal-backdrop"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) close();
            }}
          >
            <div
              className="modal modal-wide rise"
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
            >
              {done ? (
                <div className="stack">
                  <h2
                    id={titleId}
                    className="brand"
                    style={{ fontSize: "1.9rem", margin: 0 }}
                  >
                    Thank you!
                  </h2>
                  <p style={{ margin: 0, fontSize: "1.05rem", lineHeight: 1.5 }}>
                    {thankYou}
                  </p>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-primary" onClick={close}>
                      Done
                    </button>
                  </div>
                </div>
              ) : (
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
                      {isWaitlist ? "Confirm waitlist" : "Request"}
                    </p>
                    <h2
                      id={titleId}
                      className="brand"
                      style={{ fontSize: "1.85rem", margin: "0.3rem 0 0", lineHeight: 1.15 }}
                    >
                      {equipmentName}
                    </h2>
                    {isWaitlist && offerExpiresAt ? (
                      <p className="hint">
                        Confirm by {new Date(offerExpiresAt).toLocaleString()} or the offer
                        moves to the next person.
                      </p>
                    ) : null}
                  </div>

                  <AvailabilityGrid
                    label="Pickup availability"
                    value={pickupAvailability}
                    onChange={setPickupAvailability}
                  />

                  <div>
                    <label className="label" htmlFor={`notes-${equipmentId}`}>
                      Notes (optional)
                    </label>
                    <textarea
                      className="textarea"
                      id={`notes-${equipmentId}`}
                      name="renterNotes"
                      rows={3}
                      placeholder="Other gear you need, flexibility on time…"
                    />
                  </div>

                  <label className="check-row">
                    <input type="checkbox" name="needsTraining" />
                    <span>I need training or help with this gear</span>
                  </label>

                  {error ? <p className="error">{error}</p> : null}

                  <div className="modal-actions">
                    <button className="btn btn-primary" type="submit" disabled={pending}>
                      {pending
                        ? "Submitting…"
                        : isWaitlist
                          ? "Confirm waitlist request"
                          : "Submit request"}
                    </button>
                    <button
                      className="btn btn-ghost"
                      type="button"
                      onClick={close}
                      disabled={pending}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <button type="button" className="btn btn-primary" onClick={openModal}>
        {buttonLabel}
      </button>
      {dialog}
    </>
  );
}
