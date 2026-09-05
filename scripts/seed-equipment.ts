import postgres from "postgres";

const ITEMS = [
  { name: "Nikon D7000 #1", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-100", lensMount: "Nikon F", battery: "EN-EL15" },
  { name: "Nikon D7000 #2", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-101", lensMount: "Nikon F", battery: "EN-EL15" },
  { name: "Nikon D7000 #3", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-102", lensMount: "Nikon F", battery: "EN-EL15" },
  { name: "Nikon D7000 #4", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-103", lensMount: "Nikon F", battery: "EN-EL15" },
  { name: "Sony A200", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-104", lensMount: "Sony A", battery: "Infolithium M" },
  { name: "Sony A58", category: "digital" as const, subcategory: "APS-C", assetTag: "FP-105", lensMount: "Sony A", battery: "Infolithium M" },
  { name: "Minolta XD5", category: "film" as const, subcategory: "35mm film", assetTag: "FP-106", lensMount: "Minolta MD", battery: "2× LR44 / SR44" },
  { name: "Nikon N6006 #1", category: "film" as const, subcategory: "35mm film", assetTag: "FP-107", lensMount: "Nikon F", battery: "CR-P2" },
  { name: "Nikon N6006 #2", category: "film" as const, subcategory: "35mm film", assetTag: "FP-108", lensMount: "Nikon F", battery: "CR-P2" },
];

function formatNotes(item: { lensMount: string; battery: string }) {
  return `Mount: ${item.lensMount} · Battery: ${item.battery}`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const sql = postgres(url, { max: 1 });
  let inserted = 0;
  let updated = 0;

  for (const item of ITEMS) {
    const notes = formatNotes(item);
    const existing = await sql`
      select id from equipment where asset_tag = ${item.assetTag} limit 1
    `;

    if (existing.length) {
      await sql`
        update equipment
        set
          name = ${item.name},
          category = ${item.category},
          subcategory = ${item.subcategory},
          notes = ${notes},
          updated_at = now()
        where asset_tag = ${item.assetTag}
      `;
      updated += 1;
      continue;
    }

    const id = crypto.randomUUID();
    await sql`
      insert into equipment (
        id, name, category, subcategory, asset_tag, notes, status, created_at, updated_at
      ) values (
        ${id},
        ${item.name},
        ${item.category},
        ${item.subcategory},
        ${item.assetTag},
        ${notes},
        'available',
        now(),
        now()
      )
    `;
    inserted += 1;
  }

  console.log(`Done. Inserted ${inserted}, updated ${updated}.`);
  await sql.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
