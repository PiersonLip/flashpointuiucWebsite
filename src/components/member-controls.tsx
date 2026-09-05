"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MemberControls({
  userId,
  name,
  isMember,
  isManager,
  isSelf,
}: {
  userId: string;
  name: string;
  isMember: boolean;
  isManager: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<"demote" | "remove" | "setMember" | "clearMember" | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  if (isSelf) {
    return <span className="muted" style={{ fontSize: "0.85rem" }}>You</span>;
  }

  async function run(
    action: "demote" | "remove" | "setMember" | "clearMember",
    confirmText: string,
  ) {
    if (!window.confirm(confirmText)) return;
    setPending(action);
    setError(null);
    try {
      const res = await fetch("/api/manager/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, userId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Request failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="stack" style={{ gap: "0.45rem" }}>
      <div className="row" style={{ gap: "0.5rem", flexWrap: "wrap" }}>
        {isMember ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending !== null}
            onClick={() =>
              run(
                "clearMember",
                `Mark ${name} as a non-member (no paid dues)? They can still rent gear.`,
              )
            }
          >
            {pending === "clearMember" ? "…" : "Mark non-member"}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending !== null}
            onClick={() =>
              run("setMember", `Mark ${name} as a club member (paid dues)?`)
            }
          >
            {pending === "setMember" ? "…" : "Mark as member"}
          </button>
        )}
        {isManager ? (
          <button
            type="button"
            className="btn btn-ghost"
            disabled={pending !== null}
            onClick={() =>
              run(
                "demote",
                `Remove manager access for ${name}? They’ll stay as a regular account.`,
              )
            }
          >
            {pending === "demote" ? "…" : "Remove manager"}
          </button>
        ) : null}
        <button
          type="button"
          className="btn btn-danger"
          disabled={pending !== null}
          onClick={() =>
            run(
              "remove",
              `Permanently delete ${name}’s account? They’ll need to sign up again.`,
            )
          }
        >
          {pending === "remove" ? "…" : "Remove account"}
        </button>
      </div>
      {error ? <span className="error">{error}</span> : null}
    </div>
  );
}
