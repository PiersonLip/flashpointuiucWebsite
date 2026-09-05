"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const netid = String(fd.get("netid") ?? "").trim().toLowerCase();
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");
    const isMember = fd.get("isMember") === "on";

    if (!email.endsWith("@illinois.edu")) {
      setPending(false);
      setError("Only @illinois.edu emails are allowed");
      return;
    }

    try {
      const { error: err } = await authClient.signUp.email({
        email,
        password,
        name,
        netid,
        isMember,
      } as {
        email: string;
        password: string;
        name: string;
        netid: string;
        isMember: boolean;
      });

      if (err) {
        setError(err.message || "Could not create account");
        return;
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create account");
    } finally {
      setPending(false);
    }
  }

  if (done) {
    return (
      <main className="page" style={{ maxWidth: 480 }}>
        <h1 className="brand" style={{ fontSize: "2.4rem" }}>
          Check your email
        </h1>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          We sent a verification link to your @illinois.edu address. Open it, then click{" "}
          <strong>Verify email</strong> on the page to activate your account. You can’t log in
          until that’s done.
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Don’t see the message? Check your spam or junk folder — Illinois filters often hide
          first-time mail from new senders.
        </p>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Already created an account before? We don’t resend mail for duplicate sign-ups — try{" "}
          <Link href="/login">logging in</Link> or{" "}
          <Link href="/forgot-password">resetting your password</Link> instead.
        </p>
        <p style={{ marginTop: "1.25rem" }}>
          <Link href="/login" className="btn btn-primary">
            Back to login
          </Link>
        </p>
      </main>
    );
  }

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <h1 className="brand rise" style={{ fontSize: "2.5rem", marginBottom: "0.35rem" }}>
        Join Flashpoint Rentals
      </h1>
      <p className="muted rise rise-delay-1">
        Anyone with an Illinois email can rent — club membership (paid dues) is optional.
      </p>
      <form className="stack rise rise-delay-2 panel" style={{ marginTop: "1.5rem", padding: "1.25rem" }} onSubmit={onSubmit}>
        <div>
          <label className="label" htmlFor="name">
            Full name
          </label>
          <input className="input" id="name" name="name" required />
        </div>
        <div>
          <label className="label" htmlFor="netid">
            NetID
          </label>
          <input className="input" id="netid" name="netid" required pattern="[A-Za-z0-9]+" placeholder="netid" autoComplete="username" />
        </div>
        <div>
          <label className="label" htmlFor="email">
            Illinois email
          </label>
          <input className="input" id="email" name="email" type="email" required placeholder="netid@illinois.edu" />
        </div>
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input className="input" id="password" name="password" type="password" required minLength={8} />
        </div>
        <label className="check-row" htmlFor="isMember">
          <input id="isMember" name="isMember" type="checkbox" />
          <span>
            I’ve paid Flashpoint club dues this year
            <span className="muted" style={{ display: "block", fontSize: "0.85rem", marginTop: "0.2rem" }}>
              Leave unchecked if you’re not a dues-paying member yet — you can still rent gear.
            </span>
          </span>
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        Already have an account? <Link href="/login">Log in</Link>
      </p>
    </main>
  );
}
