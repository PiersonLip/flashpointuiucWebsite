"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DecideRequestControls({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [pending, setPending] = useState<"approve" | "deny" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(approve: boolean) {
    setPending(approve ? "approve" : "deny");
    setError(null);
    try {
      const res = await fetch("/api/rentals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "decide-request",
          requestId,
          approve,
          note: note.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      setNote("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="stack" style={{ gap: "0.55rem", width: "100%" }}>
      <label className="label" htmlFor={`note-${requestId}`}>
        Manager note (optional)
      </label>
      <textarea
        className="textarea"
        id={`note-${requestId}`}
        rows={2}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Pickup instructions, reason for denial…"
        disabled={pending !== null}
      />
      <div className="row">
        <button
          type="button"
          className="btn btn-primary"
          disabled={pending !== null}
          onClick={() => decide(true)}
        >
          {pending === "approve" ? "…" : "Approve"}
        </button>
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending !== null}
          onClick={() => decide(false)}
        >
          {pending === "deny" ? "…" : "Deny"}
        </button>
      </div>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
