"use client";

import Link from "next/link";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { safeReturnPath } from "@/lib/safe-return-path";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = safeReturnPath(params.get("next"));
  const [error, setError] = useState<string | null>(null);
  const [unverifiedEmail, setUnverifiedEmail] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setUnverifiedEmail(null);
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") ?? "").trim().toLowerCase();
    const password = String(fd.get("password") ?? "");

    try {
      const { error: err } = await authClient.signIn.email({ email, password });
      if (err) {
        const code = (err as { code?: string }).code ?? "";
        const msg = (err.message || "").toLowerCase();
        if (
          code === "EMAIL_NOT_VERIFIED" ||
          msg.includes("email not verified") ||
          msg.includes("verify")
        ) {
          setUnverifiedEmail(email);
          setError(
            "Verify your email before signing in. We sent another link — check inbox and spam.",
          );
          return;
        }
        setError(err.message || "Could not sign in");
        return;
      }
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setPending(false);
    }
  }

  const verifyHref =
    nextPath !== "/gear"
      ? `/verify-email?pending=1&next=${encodeURIComponent(nextPath)}`
      : "/verify-email?pending=1";

  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <h1 className="brand rise" style={{ fontSize: "2.5rem", marginBottom: "0.35rem" }}>
        Log in
      </h1>
      <p className="muted rise rise-delay-1">Illinois email and password</p>
      <form
        className="stack rise rise-delay-2 panel"
        style={{ marginTop: "1.5rem", padding: "1.25rem" }}
        onSubmit={onSubmit}
      >
        <div>
          <label className="label" htmlFor="email">
            Email
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
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            className="input"
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
          />
        </div>
        {error ? <p className="error">{error}</p> : null}
        {unverifiedEmail ? (
          <p className="muted" style={{ fontSize: "0.9rem" }}>
            Tip: check spam/junk for the verification email.{" "}
            <Link href={verifyHref}>Resend or finish verification</Link>
          </p>
        ) : null}
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Signing in…" : "Sign in"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link href="/forgot-password">Forgot password</Link>
        {" · "}
        <Link href="/register">Create account</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="page" style={{ maxWidth: 440 }}>
          <p className="muted">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
