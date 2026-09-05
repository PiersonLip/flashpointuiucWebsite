"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeReturnPath } from "@/lib/safe-return-path";

function VerifyEmailInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const pending = params.get("pending") === "1";
  const nextPath = safeReturnPath(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [pendingClick, setPendingClick] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendPending, setResendPending] = useState(false);

  const apiVerifyUrl = useMemo(() => {
    if (!token) return null;
    const callback = encodeURIComponent(nextPath);
    return `/api/auth/verify-email?token=${encodeURIComponent(token)}&callbackURL=${callback}`;
  }, [token, nextPath]);

  async function confirmVerify() {
    if (!apiVerifyUrl) return;
    setPendingClick(true);
    setError(null);
    // Full navigation so Better Auth can set cookies + redirect
    window.location.assign(apiVerifyUrl);
  }

  async function resend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setResendPending(true);
    setError(null);
    setResent(false);
    const email = String(new FormData(e.currentTarget).get("email") ?? "").trim().toLowerCase();
    try {
      const { error: err } = await authClient.sendVerificationEmail({
        email,
        callbackURL: nextPath,
      });
      if (err) {
        setError(err.message || "Could not resend verification email");
        return;
      }
      setResent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend");
    } finally {
      setResendPending(false);
    }
  }

  const loginHref =
    nextPath !== "/gear" ? `/login?next=${encodeURIComponent(nextPath)}` : "/login";

  if (token && apiVerifyUrl) {
    return (
      <main className="page" style={{ maxWidth: 480 }}>
        <h1 className="brand" style={{ fontSize: "2.4rem" }}>
          Verify your email
        </h1>
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Click the button below to activate your Flashpoint Rentals account. This extra step stops
          automatic email scanners from verifying for you.
        </p>
        {error ? <p className="error">{error}</p> : null}
        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: "1.25rem" }}
          disabled={pendingClick}
          onClick={confirmVerify}
        >
          {pendingClick ? "Verifying…" : "Verify email"}
        </button>
      </main>
    );
  }

  return (
    <main className="page" style={{ maxWidth: 480 }}>
      <h1 className="brand" style={{ fontSize: "2.4rem" }}>
        {pending ? "Email not verified yet" : "Verify your email"}
      </h1>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Check your @illinois.edu inbox for a message from Flashpoint Rentals and open the link, then
        confirm on this site.
      </p>
      <p className="muted" style={{ marginTop: "0.75rem" }}>
        Don’t see it? Check your spam or junk folder — university filters often hide first-time
        mail.
      </p>

      <form
        className="stack panel"
        style={{ marginTop: "1.5rem", padding: "1.25rem" }}
        onSubmit={resend}
      >
        <div>
          <label className="label" htmlFor="email">
            Illinois email
          </label>
          <input
            className="input"
            id="email"
            name="email"
            type="email"
            required
            placeholder="netid@illinois.edu"
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        {resent ? (
          <p className="muted">Verification email sent again. Check inbox and spam.</p>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={resendPending}>
          {resendPending ? "Sending…" : "Resend verification email"}
        </button>
      </form>

      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link href={loginHref}>Back to login</Link>
        {" · "}
        <button
          type="button"
          className="btn btn-ghost"
          style={{ display: "inline", padding: "0.2rem 0.45rem" }}
          onClick={async () => {
            await authClient.signOut();
            router.push(loginHref);
            router.refresh();
          }}
        >
          Sign out
        </button>
      </p>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <main className="page" style={{ maxWidth: 480 }}>
          <p className="muted">Loading…</p>
        </main>
      }
    >
      <VerifyEmailInner />
    </Suspense>
  );
}
