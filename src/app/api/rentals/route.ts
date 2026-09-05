import { NextResponse } from "next/server";
import { requireApiManager, requireApiUser } from "@/lib/auth-server";
import {
  createRentalRequest,
  decideRentalRequest,
  joinWaitlist,
  requestExtension,
  updateRentalSchedule,
} from "@/lib/rentals";

export async function POST(req: Request) {
  const body = await req.json();
  const action = String(body.action ?? "");

  try {
    if (action === "request") {
      const authz = await requireApiUser();
      if ("error" in authz) return authz.error;
      const id = await createRentalRequest({
        equipmentId: String(body.equipmentId),
        userId: authz.session.user.id,
        pickupAvailability: Array.isArray(body.pickupAvailability)
          ? body.pickupAvailability
          : [],
        renterNotes: body.renterNotes ? String(body.renterNotes) : undefined,
        needsTraining: Boolean(body.needsTraining),
      });
      return NextResponse.json({ id });
    }

    if (action === "waitlist") {
      const authz = await requireApiUser();
      if ("error" in authz) return authz.error;
      await joinWaitlist({
        equipmentId: String(body.equipmentId),
        userId: authz.session.user.id,
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "schedule") {
      const authz = await requireApiUser();
      if ("error" in authz) return authz.error;
      const kind = body.kind === "return" ? "return" : "pickup";
      await updateRentalSchedule({
        rentalId: String(body.rentalId),
        userId: authz.session.user.id,
        kind,
        availability: Array.isArray(body.availability) ? body.availability : [],
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "extend") {
      const authz = await requireApiUser();
      if ("error" in authz) return authz.error;
      const result = await requestExtension({
        rentalId: String(body.rentalId),
        userId: authz.session.user.id,
      });
      return NextResponse.json(result);
    }

    if (action === "decide-request") {
      const authz = await requireApiManager();
      if ("error" in authz) return authz.error;
      await decideRentalRequest({
        requestId: String(body.requestId),
        managerId: authz.session.user.id,
        approve: Boolean(body.approve),
        note: body.note ? String(body.note) : undefined,
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
