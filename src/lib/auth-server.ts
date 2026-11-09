import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/safe-return-path";

export { safeReturnPath } from "@/lib/safe-return-path";

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

function loginRedirect(next?: string) {
  if (!next) return "/login";
  return `/login?next=${encodeURIComponent(safeReturnPath(next))}`;
}

function verifyRedirect(next?: string) {
  if (!next) return "/verify-email?pending=1";
  return `/verify-email?pending=1&next=${encodeURIComponent(safeReturnPath(next))}`;
}

export async function requireUser(opts?: { next?: string }) {
  const session = await getSession();
  const next = opts?.next;
  if (!session?.user) {
    redirect(loginRedirect(next));
  }
  if (!session.user.emailVerified) {
    redirect(verifyRedirect(next));
  }
  return session;
}

export async function requireManager(opts?: { next?: string }) {
  const session = await requireUser({ next: opts?.next ?? "/manager" });
  if (!session.user.isManager) {
    redirect("/gear");
  }
  return session;
}

export async function requireApiUser() {
  const session = await getSession();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!session.user.emailVerified) {
    return {
      error: NextResponse.json(
        { error: "Verify your email before using the site. Check inbox and spam." },
        { status: 403 },
      ),
    };
  }
  return { session };
}

export async function requireApiManager() {
  const result = await requireApiUser();
  if ("error" in result) return result;
  if (!result.session.user.isManager) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
}
