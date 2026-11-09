/**
 * Seeds board_members from the static siteConfig roster when the table is empty.
 * Safe to re-run — does nothing if members already exist.
 */
import postgres from "postgres";

const BOARD = [
  { role: "President", name: "Colin Dragan" },
  { role: "Vice President", name: "Elisha Karottu" },
  { role: "Secretary", name: "eirini" },
  { role: "Membership Director", name: "Maryam" },
  { role: "Treasurer", name: "Annya" },
  { role: "Event Coordinator", name: "mihir" },
  { role: "Media Director", name: "Eshaan" },
  { role: "Historian", name: "alexa" },
  { role: "Historian", name: "Ashley Xiao" },
  { role: "Technician", name: "Michael" },
  { role: "Advisory", name: "isaac tu" },
] as const;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const sql = postgres(url, { max: 1 });
  const [{ count }] = await sql<{ count: string }[]>`
    select count(*)::text as count from board_members
  `;

  if (Number(count) > 0) {
    console.log(`board_members already has ${count} row(s); skipping seed`);
    await sql.end();
    return;
  }

  for (let i = 0; i < BOARD.length; i++) {
    const member = BOARD[i];
    const id = crypto.randomUUID();
    await sql`
      insert into board_members (id, role, name, image_url, sort_order, created_at, updated_at)
      values (${id}, ${member.role}, ${member.name}, null, ${i}, now(), now())
    `;
  }

  console.log(`Seeded ${BOARD.length} board members`);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
