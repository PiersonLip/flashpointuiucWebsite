"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { Suspense } from "react";

function ResetForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const password = String(new FormData(e.currentTarget).get("password") ?? "");
    const { error: err } = await authClient.resetPassword({ newPassword: password, token });
    setPending(false);
    if (err) {
      setError(err.message || "Reset failed");
      return;
    }
    router.push("/login");
  }

  if (!token) {
    return <p className="error">Missing reset token. Use the link from your email.</p>;
  }

  return (
    <form className="stack panel" style={{ marginTop: "1.5rem", padding: "1.25rem" }} onSubmit={onSubmit}>
      <div>
        <label className="label" htmlFor="password">
          New password
        </label>
        <input className="input" id="password" name="password" type="password" required minLength={8} />
      </div>
      {error ? <p className="error">{error}</p> : null}
      <button className="btn btn-primary" disabled={pending} type="submit">
        {pending ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="page" style={{ maxWidth: 440 }}>
      <h1 className="brand" style={{ fontSize: "2.4rem" }}>
        Choose a new password
      </h1>
      <Suspense>
        <ResetForm />
      </Suspense>
      <p className="muted" style={{ marginTop: "1rem" }}>
        <Link href="/login">Back to login</Link>
      </p>
    </main>
  );
}
