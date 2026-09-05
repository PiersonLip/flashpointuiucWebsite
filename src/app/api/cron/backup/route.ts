import { NextResponse } from "next/server";
import { spawn } from "node:child_process";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const child = spawn("npx", ["tsx", "scripts/backup-drive.ts"], {
        cwd: process.cwd(),
        env: process.env,
        stdio: "inherit",
      });
      child.on("exit", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`backup exited ${code}`));
      });
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Backup failed" },
      { status: 500 },
    );
  }
}
