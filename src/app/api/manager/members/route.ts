import { NextResponse } from "next/server";
import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  equipment,
  extensionRequests,
  managerPromotions,
  rentalRequests,
  rentals,
  user,
  waitlistEntries,
} from "@/db/schema";
import { requireApiManager } from "@/lib/auth-server";
import { APP_NAME } from "@/lib/constants";
import { sendEmail } from "@/lib/email";
import { notifyNextWaitlist } from "@/lib/rentals";

async function managerCount() {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(user)
    .where(eq(user.isManager, true));
  return Number(count);
}

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const body = await req.json();
  const action = String(body.action ?? "");
  const userId = String(body.userId ?? "");

  if (!userId) {
    return NextResponse.json({ error: "Missing user" }, { status: 400 });
  }

  const [target] = await db.select().from(user).where(eq(user.id, userId)).limit(1);
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (target.id === authz.session.user.id) {
    return NextResponse.json(
      { error: "You can’t change your own account from here" },
      { status: 400 },
    );
  }

  try {
    if (action === "setMember" || action === "clearMember") {
      const isMember = action === "setMember";
      if (target.isMember === isMember) {
        return NextResponse.json({ ok: true, name: target.name });
      }

      await db
        .update(user)
        .set({ isMember, updatedAt: new Date() })
        .where(eq(user.id, target.id));

      return NextResponse.json({ ok: true, name: target.name, isMember });
    }

    if (action === "demote") {
      if (!target.isManager) {
        return NextResponse.json({ error: "Not a manager" }, { status: 400 });
      }
      if ((await managerCount()) <= 1) {
        return NextResponse.json(
          { error: "Can’t remove the last manager" },
          { status: 400 },
        );
      }

      await db
        .update(user)
        .set({ isManager: false, updatedAt: new Date() })
        .where(eq(user.id, target.id));

      await sendEmail({
        to: target.email,
        subject: `${APP_NAME}: manager access removed`,
        text: `Hi ${target.name},\n\nYour manager access was removed by ${authz.session.user.name}. You can still rent gear.`,
      });

      return NextResponse.json({ ok: true, name: target.name });
    }

    if (action === "remove") {
      if (target.isManager && (await managerCount()) <= 1) {
        return NextResponse.json(
          { error: "Can’t remove the last manager" },
          { status: 400 },
        );
      }

      const openRentals = await db
        .select({ id: rentals.id })
        .from(rentals)
        .where(and(eq(rentals.userId, target.id), ne(rentals.status, "returned")))
        .limit(1);

      if (openRentals.length) {
        return NextResponse.json(
          {
            error:
              "This person still has reserved or checked-out gear. Finish those rentals first.",
          },
          { status: 400 },
        );
      }

      // Cancel pending requests and free held equipment
      const pending = await db
        .select()
        .from(rentalRequests)
        .where(
          and(eq(rentalRequests.userId, target.id), eq(rentalRequests.status, "pending")),
        );

      const freedEquipment = new Set<string>();
      for (const req of pending) {
        await db
          .update(rentalRequests)
          .set({
            status: "cancelled",
            decidedById: authz.session.user.id,
            decidedAt: new Date(),
            note: "Account removed by manager",
          })
          .where(eq(rentalRequests.id, req.id));

        await db
          .update(equipment)
          .set({ status: "available", updatedAt: new Date() })
          .where(and(eq(equipment.id, req.equipmentId), eq(equipment.status, "requested")));
        freedEquipment.add(req.equipmentId);
      }

      await db.delete(waitlistEntries).where(eq(waitlistEntries.userId, target.id));

      // Clear returned rentals + extensions so FK delete can succeed
      const pastRentals = await db
        .select({ id: rentals.id })
        .from(rentals)
        .where(eq(rentals.userId, target.id));

      for (const r of pastRentals) {
        await db.delete(extensionRequests).where(eq(extensionRequests.rentalId, r.id));
      }
      await db.delete(rentals).where(eq(rentals.userId, target.id));
      await db.delete(rentalRequests).where(eq(rentalRequests.userId, target.id));

      // Null out optional FKs that would block delete
      await db
        .update(equipment)
        .set({ createdById: null })
        .where(eq(equipment.createdById, target.id));
      await db
        .update(rentalRequests)
        .set({ decidedById: null })
        .where(eq(rentalRequests.decidedById, target.id));
      await db
        .update(extensionRequests)
        .set({ decidedById: null })
        .where(eq(extensionRequests.decidedById, target.id));
      await db
        .update(managerPromotions)
        .set({ promotedUserId: null })
        .where(eq(managerPromotions.promotedUserId, target.id));
      await db
        .delete(managerPromotions)
        .where(eq(managerPromotions.promotedById, target.id));

      await db.delete(user).where(eq(user.id, target.id));

      for (const equipmentId of freedEquipment) {
        await notifyNextWaitlist(equipmentId);
      }

      await sendEmail({
        to: target.email,
        subject: `${APP_NAME}: account removed`,
        text: `Hi ${target.name},\n\nYour Flashpoint Rentals account was removed by a manager (${authz.session.user.name}). If this was a mistake, sign up again with your Illinois email.`,
      });

      return NextResponse.json({ ok: true, name: target.name });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 400 },
    );
  }
}
