const nodemailer = require("nodemailer");

async function main() {
  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_APP_PASSWORD;
  const from = process.env.EMAIL_FROM || user;
  const to = process.env.TEST_TO || "pl45@illinois.edu";

  if (!user || !pass) {
    throw new Error("Missing GMAIL_USER / GMAIL_APP_PASSWORD");
  }

  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });

  await transport.verify();
  const info = await transport.sendMail({
    from,
    to,
    subject: "UIAS Rentals: email test",
    text: "Gmail SMTP is working for UIAS Rentals. You can ignore this message.",
  });
  console.log("sent", info.messageId);
}

main().catch((e) => {
  console.error("FAIL", e.message);
  process.exit(1);
});
