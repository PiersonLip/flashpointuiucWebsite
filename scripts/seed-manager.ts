import postgres from "postgres";
import { hashPassword } from "better-auth/crypto";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const email = (process.env.BOOTSTRAP_MANAGER_EMAIL ?? "pl45@illinois.edu").toLowerCase();
  const name = process.env.BOOTSTRAP_MANAGER_NAME ?? "Pierson Lipschultz";
  const netid = (process.env.BOOTSTRAP_MANAGER_NETID ?? "pl45").toLowerCase();
  const password = process.env.BOOTSTRAP_MANAGER_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error("BOOTSTRAP_MANAGER_PASSWORD required");
  }

  const sql = postgres(url, { max: 1 });
  const existing = await sql`select id from "user" where email = ${email} limit 1`;

  if (existing.length === 0) {
    const userId = crypto.randomUUID().replace(/-/g, "");
    const accountId = crypto.randomUUID().replace(/-/g, "");
    const hashed = await hashPassword(password);
    await sql.begin(async (tx) => {
      await tx`
        insert into "user" (id, name, email, email_verified, netid, is_member, is_manager, created_at, updated_at)
        values (${userId}, ${name}, ${email}, true, ${netid}, true, true, now(), now())
      `;
      await tx`
        insert into account (
          id, account_id, provider_id, issuer, user_id, password, created_at, updated_at
        ) values (
          ${accountId}, ${userId}, 'credential', 'local:credential', ${userId}, ${hashed}, now(), now()
        )
      `;
    });
    console.log("Created manager", email);
  } else {
    await sql`
      update "user"
      set is_manager = true, is_member = true, email_verified = true, name = ${name}, netid = ${netid}, updated_at = now()
      where email = ${email}
    `;
    console.log("Updated existing manager", email);
  }

  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
