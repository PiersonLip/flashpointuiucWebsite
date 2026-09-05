import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { managerPromotions, user } from "@/db/schema";
import { requireApiManager } from "@/lib/auth-server";
import { APP_NAME, APP_URL, isIllinoisEmail, normalizeEmail } from "@/lib/constants";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  const body = await req.json();
  const email = normalizeEmail(String(body.email ?? ""));

  if (!isIllinoisEmail(email)) {
    return NextResponse.json(
      { error: "Managers must use an @illinois.edu email" },
      { status: 400 },
    );
  }

  const [target] = await db.select().from(user).where(eq(user.email, email)).limit(1);

  if (!target) {
    return NextResponse.json(
      {
        error:
          "No account with that email yet. Ask them to sign up first, then promote.",
      },
      { status: 404 },
    );
  }

  if (target.isManager) {
    return NextResponse.json({ error: "Already a manager" }, { status: 400 });
  }

  await db
    .update(user)
    .set({ isManager: true, updatedAt: new Date() })
    .where(eq(user.id, target.id));

  await db.insert(managerPromotions).values({
    id: crypto.randomUUID(),
    email,
    promotedUserId: target.id,
    promotedById: authz.session.user.id,
  });

  await sendEmail({
    to: email,
    subject: `${APP_NAME}: you are now a manager`,
    text: `Hi ${target.name},\n\nYou were promoted to manager by ${authz.session.user.name}. Open the manager dashboard:\n${APP_URL}/manager`,
  });

  return NextResponse.json({ ok: true, name: target.name });
}
