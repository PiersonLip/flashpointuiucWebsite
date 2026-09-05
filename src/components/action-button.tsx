"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ActionButton({
  label,
  body,
  endpoint = "/api/rentals",
  method = "POST",
  variant = "primary",
  confirm,
  onDone,
}: {
  label: string;
  body: Record<string, unknown>;
  endpoint?: string;
  method?: "POST" | "PATCH" | "DELETE";
  variant?: "primary" | "ghost" | "danger";
  /** If set, ask before POSTing (browser confirm). */
  confirm?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="stack" style={{ gap: "0.35rem" }}>
      <button
        type="button"
        className={`btn btn-${variant}`}
        disabled={pending}
        onClick={async () => {
          if (confirm && !window.confirm(confirm)) return;
          setPending(true);
          setError(null);
          try {
            const res = await fetch(endpoint, {
              method,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(body),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || "Request failed");
            onDone?.();
            router.refresh();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
          } finally {
            setPending(false);
          }
        }}
      >
        {pending ? "…" : label}
      </button>
      {error ? <span className="error">{error}</span> : null}
    </span>
  );
}
