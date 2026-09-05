import "dotenv/config";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { createReadStream, promises as fs } from "node:fs";
import path from "node:path";
import { google } from "googleapis";
import * as XLSX from "xlsx";
import { db } from "../src/db";
import { equipment, rentals, rentalHistory, user } from "../src/db/schema";
import { eq } from "drizzle-orm";

const execFileAsync = promisify(execFile);

async function getDrive() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId || !clientSecret || !refreshToken) {
    console.log("Google Drive credentials missing — skipping Drive upload");
    return null;
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret);
  oauth2.setCredentials({ refresh_token: refreshToken });
  return google.drive({ version: "v3", auth: oauth2 });
}

async function uploadFile(
  drive: NonNullable<Awaited<ReturnType<typeof getDrive>>>,
  folderId: string,
  filePath: string,
  mimeType: string,
) {
  const name = path.basename(filePath);
  await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType, body: createReadStream(filePath) },
    fields: "id",
  });
}

/** Only prune dated backup dumps — never wipe arbitrary files in the folder. */
async function pruneOldBackups(
  drive: NonNullable<Awaited<ReturnType<typeof getDrive>>>,
  folderId: string,
) {
  const cutoff = Date.now() - 14 * 24 * 60 * 60 * 1000;
  const list = await drive.files.list({
    q: `'${folderId}' in parents and trashed = false`,
    fields: "files(id, name, createdTime)",
    pageSize: 200,
  });

  const backupName = /^uias-\d{4}-\d{2}-\d{2}\.(sql|json|xlsx)$/i;

  for (const file of list.data.files ?? []) {
    if (!file.id || !file.createdTime || !file.name) continue;
    if (!backupName.test(file.name)) continue;
    if (new Date(file.createdTime).getTime() < cutoff) {
      await drive.files.delete({ fileId: file.id });
      console.log("Deleted old backup", file.name);
    }
  }
}

async function main() {
  const stamp = new Date().toISOString().slice(0, 10);
  const outDir = path.join(process.cwd(), ".backups");
  await fs.mkdir(outDir, { recursive: true });

  const dumpPath = path.join(outDir, `uias-${stamp}.sql`);
  const sheetPath = path.join(outDir, `uias-inventory-${stamp}.xlsx`);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL required");

  // Prefer dockerized pg_dump when PGDUMP_CMD is set, else local pg_dump
  if (process.env.PGDUMP_VIA_DOCKER === "1") {
    const container = process.env.PGDUMP_CONTAINER ?? "uias-rentals-db-1";
    await execFileAsync(
      "docker",
      ["exec", container, "pg_dump", "-U", "uias", "-d", "uias_rentals"],
      { encoding: "utf8" },
    ).then(async ({ stdout }) => {
      await fs.writeFile(dumpPath, stdout);
    });
  } else {
    try {
      await execFileAsync("pg_dump", [databaseUrl, "-f", dumpPath]);
    } catch {
      console.warn("pg_dump unavailable — writing schema/data JSON fallback instead of SQL");
      const inventory = await db.select().from(equipment);
      const history = await db.select().from(rentalHistory);
      await fs.writeFile(
        dumpPath.replace(/\.sql$/, ".json"),
        JSON.stringify({ inventory, history, exportedAt: new Date().toISOString() }, null, 2),
      );
    }
  }

  const inventory = await db.select().from(equipment);
  const active = await db
    .select({
      rentalId: rentals.id,
      gear: equipment.name,
      renter: user.name,
      email: user.email,
      netid: user.netid,
      status: rentals.status,
      dueAt: rentals.dueAt,
    })
    .from(rentals)
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .innerJoin(user, eq(rentals.userId, user.id))
    .where(eq(rentals.status, "active"));

  const history = await db.select().from(rentalHistory);

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(inventory), "Inventory");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(active), "ActiveRentals");
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(history), "RentalHistory");
  XLSX.writeFile(wb, sheetPath);

  const drive = await getDrive();
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (drive && folderId) {
    const sqlExists = await fs
      .access(dumpPath)
      .then(() => true)
      .catch(() => false);
    if (sqlExists) {
      await uploadFile(drive, folderId, dumpPath, "application/sql");
    } else {
      const jsonPath = dumpPath.replace(/\.sql$/, ".json");
      await uploadFile(drive, folderId, jsonPath, "application/json");
    }
    await uploadFile(
      drive,
      folderId,
      sheetPath,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    await pruneOldBackups(drive, folderId);
    console.log("Uploaded backups to Drive");
  } else {
    console.log("Local backups written to", outDir);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
