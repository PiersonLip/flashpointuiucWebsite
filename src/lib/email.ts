import nodemailer from "nodemailer";

const from = process.env.EMAIL_FROM ?? process.env.GMAIL_USER ?? "noreply@flashpointuiuc.com";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function createTransport() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function mailConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);
}

/** Send email. Never throws — logs failures so rental DB commits stay consistent. */
export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  const transport = createTransport();
  if (!transport) {
    const prodLike =
      process.env.NODE_ENV === "production" ||
      (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");
    if (prodLike) {
      console.error(
        "[email] GMAIL_USER / GMAIL_APP_PASSWORD missing — not sending:",
        opts.to,
        opts.subject,
      );
    } else {
      console.log("[email:dev]", opts.to, opts.subject, "\n", opts.text);
    }
    return { queued: false, logged: true };
  }

  try {
    await transport.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? `<pre style="font-family:sans-serif">${escapeHtml(opts.text)}</pre>`,
    });
    return { queued: true, logged: false };
  } catch (err) {
    console.error("[email] send failed", opts.to, opts.subject, err);
    return { queued: false, logged: false, error: true };
  }
}

export function assertMailConfiguredInProduction() {
  if (!mailConfigured()) {
    const prodLike =
      process.env.NODE_ENV === "production" ||
      (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");
    if (prodLike) {
      console.error("[email] WARNING: Gmail SMTP is not configured on this server");
    }
  }
}
