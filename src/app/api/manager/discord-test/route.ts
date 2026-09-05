import { NextResponse } from "next/server";
import { requireApiManager } from "@/lib/auth-server";
import { discordConfigured, sendDiscordWebhook } from "@/lib/discord";
import { APP_URL } from "@/lib/constants";

export async function GET() {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  return NextResponse.json({ configured: discordConfigured() });
}

export async function POST() {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  if (!discordConfigured()) {
    return NextResponse.json(
      {
        error:
          "Discord not configured. Set DISCORD_WEBHOOK_URL on the server (.env) and restart.",
      },
      { status: 400 },
    );
  }

  const result = await sendDiscordWebhook({
    title: "Test notification",
    body: `Sent by ${authz.session.user.name} from the manager panel.\n\nIf you see this, manager Discord alerts are working.\n${APP_URL}/manager`,
  });

  if (!result.sent) {
    return NextResponse.json(
      { error: "Webhook request failed — check the URL and channel permissions." },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true });
}
