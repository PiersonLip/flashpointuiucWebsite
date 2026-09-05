"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").toLowerCase();
    if (!email.endsWith("@illinois.edu")) {
      setPending(false);
      setError("Password reset is only available for @illinois.edu emails");
      return;
    }
    const { error: err } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });
    setPending(false);
    if (err) {
      setError(err.message || "Could not send reset email");
      return;
    }
    setDone(true);
  }

  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <h1 className="brand" style={{ fontSize: "2.4rem" }}>
        Reset password
      </h1>
      {done ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          If that account exists, a reset link was sent to your Illinois email.
        </p>
      ) : (
        <form className="stack panel" style={{ marginTop: "1.5rem", padding: "1.25rem" }} onSubmit={onSubmit}>
          <div>
            <label className="label" htmlFor="email">
              Illinois email
            </label>
            <input className="input" id="email" name="email" type="email" required />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn btn-primary" disabled={pending} type="submit">
            {pending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link href="/login">Back to login</Link>
      </p>
    </main>
  );
}
