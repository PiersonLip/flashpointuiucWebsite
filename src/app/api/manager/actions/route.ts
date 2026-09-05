import { NextResponse } from "next/server";
import { requireApiManager } from "@/lib/auth-server";
import {
  confirmPickup,
  confirmReturn,
  decideExtension,
} from "@/lib/rentals";

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  const body = await req.json();
  const action = String(body.action ?? "");

  try {
    if (action === "pickup") {
      await confirmPickup({
        rentalId: String(body.rentalId),
        managerId: authz.session.user.id,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "return") {
      await confirmReturn({
        rentalId: String(body.rentalId),
        managerId: authz.session.user.id,
      });
      return NextResponse.json({ ok: true });
    }
    if (action === "decide-extension") {
      await decideExtension({
        extensionId: String(body.extensionId),
        managerId: authz.session.user.id,
        approve: Boolean(body.approve),
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
