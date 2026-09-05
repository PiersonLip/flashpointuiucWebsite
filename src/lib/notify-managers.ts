import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema";
import { APP_NAME, APP_URL } from "@/lib/constants";
import { sendDiscordWebhook } from "@/lib/discord";
import { sendEmail } from "@/lib/email";

/** Email every manager and mirror the alert to Discord (if configured). */
export async function notifyManagers(opts: {
  subject: string;
  text: string;
  /** Shorter Discord embed title; defaults to subject without app prefix */
  discordTitle?: string;
  /** Skip managers who already got a member-facing email for this event */
  excludeEmails?: string[];
}) {
  const excluded = new Set(
    (opts.excludeEmails ?? []).map((email) => email.trim().toLowerCase()).filter(Boolean),
  );

  const managers = await db
    .select({ email: user.email })
    .from(user)
    .where(eq(user.isManager, true));

  for (const m of managers) {
    if (excluded.has(m.email.toLowerCase())) continue;
    await sendEmail({
      to: m.email,
      subject: opts.subject,
      text: opts.text,
    });
  }

  const prefix = `${APP_NAME}: `;
  const title =
    opts.discordTitle ??
    (opts.subject.startsWith(prefix) ? opts.subject.slice(prefix.length) : opts.subject);

  await sendDiscordWebhook({
    title,
    body: opts.text,
    url: `${APP_URL}/manager`,
  });
}
