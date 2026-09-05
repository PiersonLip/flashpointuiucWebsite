"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function PromoteManagerForm() {
  const router = useRouter();
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setMsg(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "");
    const res = await fetch("/api/manager/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(data.error || "Failed");
      return;
    }
    setMsg(`Promoted ${data.name}`);
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form className="row panel" style={{ padding: "1rem", marginTop: "0.75rem" }} onSubmit={onSubmit}>
      <input
        className="input"
        name="email"
        type="email"
        required
        placeholder="netid@illinois.edu"
        style={{ flex: 1, minWidth: 220 }}
      />
      <button className="btn btn-primary" type="submit" disabled={pending}>
        {pending ? "…" : "Make manager"}
      </button>
      {error ? <span className="error">{error}</span> : null}
      {msg ? <span className="muted">{msg}</span> : null}
    </form>
  );
}
