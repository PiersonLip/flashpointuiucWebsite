import { NextResponse } from "next/server";
import {
  markOverdueRentals,
  processWaitlistOffers,
  sendDueSoonReminders,
} from "@/lib/rentals";
import { assertMailConfiguredInProduction } from "@/lib/email";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  assertMailConfiguredInProduction();

  const overdue = await markOverdueRentals();
  const dueSoon = await sendDueSoonReminders();
  const waitlistExpired = await processWaitlistOffers();

  return NextResponse.json({ overdue, dueSoon, waitlistExpired });
}
