"use client";

import { useEffect, useState } from "react";

export function DiscordNotifyControls() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/manager/discord-test")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled) setConfigured(Boolean(data.configured));
      })
      .catch(() => {
        if (!cancelled) setConfigured(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function sendTest() {
    setPending(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/manager/discord-test", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed");
      setMsg("Test sent — check your Discord channel.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel" style={{ padding: "1rem", marginTop: "0.75rem" }}>
      <p className="muted" style={{ margin: 0, fontSize: "0.9rem" }}>
        {configured === null
          ? "Checking Discord…"
          : configured
            ? "Discord webhook is configured. Managers also get channel alerts for new requests, return availability, extension requests, and overdue gear."
            : "Discord not configured. In Discord: channel → Edit → Integrations → Webhooks → New Webhook → copy URL into server env as DISCORD_WEBHOOK_URL, then restart / redeploy."}
      </p>
      <div className="row" style={{ marginTop: "0.75rem", gap: "0.5rem", alignItems: "center" }}>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={pending || configured === false}
          onClick={sendTest}
        >
          {pending ? "…" : "Send test to Discord"}
        </button>
        {error ? <span className="error">{error}</span> : null}
        {msg ? <span className="muted">{msg}</span> : null}
      </div>
    </div>
  );
}
