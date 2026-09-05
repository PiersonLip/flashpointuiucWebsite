import { APP_NAME, APP_URL } from "@/lib/constants";

export function discordConfigured() {
  return Boolean(process.env.DISCORD_WEBHOOK_URL?.trim());
}

/** Post a manager alert to Discord. No-ops if DISCORD_WEBHOOK_URL is unset. Never throws. */
export async function sendDiscordWebhook(opts: {
  title: string;
  body: string;
  url?: string;
}) {
  const webhook = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!webhook) {
    return { sent: false as const, reason: "unconfigured" as const };
  }

  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: APP_NAME,
        embeds: [
          {
            title: opts.title.slice(0, 256),
            description: opts.body.slice(0, 3900),
            url: opts.url ?? `${APP_URL}/manager`,
            color: 0xff5f05,
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[discord] webhook failed", res.status, detail);
      return { sent: false as const, reason: "http" as const };
    }

    return { sent: true as const };
  } catch (err) {
    console.error("[discord] webhook error", err);
    return { sent: false as const, reason: "error" as const };
  }
}
