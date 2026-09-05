import { and, asc, eq, gt, isNotNull, isNull, lt, ne, sql } from "drizzle-orm";
import { addDays, addHours, subHours } from "date-fns";
import { db } from "@/db";
import {
  equipment,
  extensionRequests,
  rentalHistory,
  rentalRequests,
  rentals,
  user,
  waitlistEntries,
} from "@/db/schema";
import { APP_NAME, APP_URL, DEFAULT_RENTAL_DAYS, WAITLIST_OFFER_HOURS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/datetime";
import { sendEmail } from "@/lib/email";
import { notifyManagers } from "@/lib/notify-managers";
import {
  AvailabilityRange,
  earliestStart,
  formatAvailabilityList,
  parseAvailability,
} from "@/lib/availability";

function id() {
  return crypto.randomUUID();
}

export async function userHasOverdue(userId: string) {
  const rows = await db
    .select({ id: rentals.id })
    .from(rentals)
    .where(and(eq(rentals.userId, userId), eq(rentals.status, "overdue")))
    .limit(1);
  return rows.length > 0;
}

export async function markOverdueRentals() {
  const now = new Date();
  const overdue = await db
    .select({
      rental: rentals,
      email: user.email,
      name: user.name,
      gearName: equipment.name,
    })
    .from(rentals)
    .innerJoin(user, eq(rentals.userId, user.id))
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .where(
      and(
        eq(rentals.status, "active"),
        lt(rentals.dueAt, now),
        isNull(rentals.returnedAt),
      ),
    );

  for (const row of overdue) {
    await db
      .update(rentals)
      .set({ status: "overdue" })
      .where(eq(rentals.id, row.rental.id));

    await sendEmail({
      to: row.email,
      subject: `${APP_NAME}: overdue gear — ${row.gearName}`,
      text: `Hi ${row.name},\n\nYour rental of "${row.gearName}" is overdue. New rental requests are blocked until it is returned.\n\nPlease arrange a return with a manager.\n${APP_URL}/my-rentals`,
    });
  }

  if (overdue.length) {
    const lines = overdue
      .map((row) => `• ${row.gearName} — ${row.name} (${row.email})`)
      .join("\n");
    await notifyManagers({
      subject: `${APP_NAME}: ${overdue.length} rental(s) overdue`,
      text: `${overdue.length} rental(s) just became overdue:\n\n${lines}\n\nReview: ${APP_URL}/manager`,
      discordTitle: `${overdue.length} rental(s) overdue`,
      excludeEmails: overdue.map((row) => row.email),
    });
  }

  return overdue.length;
}

export async function createRentalRequest(opts: {
  equipmentId: string;
  userId: string;
  pickupAvailability: AvailabilityRange[];
  renterNotes?: string;
  needsTraining: boolean;
}) {
  if (await userHasOverdue(opts.userId)) {
    throw new Error("You have overdue gear. Return it before requesting more.");
  }

  const pickupAvailability = parseAvailability(opts.pickupAvailability);
  if (!pickupAvailability.length) {
    throw new Error("Select at least one pickup time window");
  }

  const preferredPickupAt = earliestStart(pickupAvailability)!;
  if (preferredPickupAt.getTime() < Date.now() - 60_000) {
    throw new Error("Include at least one pickup window that starts in the future");
  }

  const days = DEFAULT_RENTAL_DAYS;
  const requestId = id();
  let itemName = "gear";
  let waitlistHold = false;

  try {
    await db.transaction(async (tx) => {
      const [item] = await tx
        .select()
        .from(equipment)
        .where(eq(equipment.id, opts.equipmentId))
        .for("update")
        .limit(1);

      if (!item) throw new Error("Equipment not found");
      if (item.status !== "available") {
        throw new Error("This item is not available to request");
      }
      itemName = item.name;

      const activeOffer = await getActiveWaitlistOfferTx(tx, opts.equipmentId);
      if (activeOffer && activeOffer.userId !== opts.userId) {
        throw new Error(
          "This item is held for the next person on the waitlist. Try again after their window ends.",
        );
      }
      if (!activeOffer) {
        const waiting = await tx
          .select({ id: waitlistEntries.id })
          .from(waitlistEntries)
          .where(eq(waitlistEntries.equipmentId, opts.equipmentId))
          .limit(1);
        if (waiting.length) {
          waitlistHold = true;
          throw new Error("WAITLIST_HOLD");
        }
      }

      const existing = await tx
        .select({ id: rentalRequests.id })
        .from(rentalRequests)
        .where(
          and(
            eq(rentalRequests.equipmentId, opts.equipmentId),
            eq(rentalRequests.userId, opts.userId),
            eq(rentalRequests.status, "pending"),
          ),
        )
        .limit(1);

      if (existing.length) throw new Error("You already have a pending request");

      const claimed = await tx
        .update(equipment)
        .set({ status: "requested", updatedAt: new Date() })
        .where(and(eq(equipment.id, opts.equipmentId), eq(equipment.status, "available")))
        .returning({ id: equipment.id });

      if (!claimed.length) {
        throw new Error("This item is not available to request");
      }

      await tx.insert(rentalRequests).values({
        id: requestId,
        equipmentId: opts.equipmentId,
        userId: opts.userId,
        status: "pending",
        preferredPickupAt,
        preferredReturnAt: null,
        pickupAvailability,
        returnAvailability: [],
        requestedDays: days,
        renterNotes: opts.renterNotes?.trim() || null,
        needsTraining: opts.needsTraining,
      });

      if (activeOffer && activeOffer.userId === opts.userId) {
        await tx.delete(waitlistEntries).where(eq(waitlistEntries.id, activeOffer.id));
        await reindexWaitlistTx(tx, opts.equipmentId);
      }
    });
  } catch (err) {
    if (waitlistHold || (err instanceof Error && err.message === "WAITLIST_HOLD")) {
      await notifyNextWaitlist(opts.equipmentId);
      throw new Error(
        "This item is reserved for the waitlist. The next person has been notified.",
      );
    }
    throw err;
  }

  const [renter] = await db
    .select()
    .from(user)
    .where(eq(user.id, opts.userId))
    .limit(1);

  const details = [
    `Pickup availability: ${formatAvailabilityList(pickupAvailability)}`,
    `Requested length: ${days} day(s)`,
    `Needs training/help: ${opts.needsTraining ? "yes" : "no"}`,
    opts.renterNotes?.trim() ? `Notes: ${opts.renterNotes.trim()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  await notifyManagers({
    subject: `${APP_NAME}: rental request — ${itemName}`,
    text: `${renter?.name ?? "A member"} (${renter?.email}) requested "${itemName}".\n\n${details}\n\nReview: ${APP_URL}/manager`,
    discordTitle: `Rental request — ${itemName}`,
    excludeEmails: renter?.email ? [renter.email] : [],
  });

  if (renter) {
    await sendEmail({
      to: renter.email,
      subject: `${APP_NAME}: request received — ${itemName}`,
      text: `Hi ${renter.name},\n\nWe received your request for "${itemName}".\n\n${details}\n\nA manager will review it and email you when it’s approved or denied.\n\nTrack it here: ${APP_URL}/my-rentals`,
    });
  }

  return requestId;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function getActiveWaitlistOfferTx(tx: Tx, equipmentId: string) {
  const now = new Date();
  const [row] = await tx
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.equipmentId, equipmentId),
        isNotNull(waitlistEntries.offerExpiresAt),
        gt(waitlistEntries.offerExpiresAt, now),
      ),
    )
    .orderBy(asc(waitlistEntries.position))
    .limit(1);
  return row ?? null;
}

async function reindexWaitlistTx(tx: Tx, equipmentId: string) {
  const remaining = await tx
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.equipmentId, equipmentId))
    .orderBy(asc(waitlistEntries.position), asc(waitlistEntries.createdAt));

  for (let i = 0; i < remaining.length; i++) {
    await tx
      .update(waitlistEntries)
      .set({ position: i + 1 })
      .where(eq(waitlistEntries.id, remaining[i].id));
  }
}

export async function decideRentalRequest(opts: {
  requestId: string;
  managerId: string;
  approve: boolean;
  note?: string;
}) {
  let itemName: string | undefined;
  let renterEmail: string | undefined;
  let renterName: string | undefined;
  let equipmentId = "";

  await db.transaction(async (tx) => {
    const [req] = await tx
      .select()
      .from(rentalRequests)
      .where(eq(rentalRequests.id, opts.requestId))
      .for("update")
      .limit(1);

    if (!req || req.status !== "pending") {
      throw new Error("Request not found or already decided");
    }
    equipmentId = req.equipmentId;

    const [item] = await tx
      .select()
      .from(equipment)
      .where(eq(equipment.id, req.equipmentId))
      .for("update")
      .limit(1);

    const [renter] = await tx
      .select()
      .from(user)
      .where(eq(user.id, req.userId))
      .limit(1);

    itemName = item?.name;
    renterEmail = renter?.email;
    renterName = renter?.name;

    if (opts.approve) {
      const open = await tx
        .select({ id: rentals.id })
        .from(rentals)
        .where(and(eq(rentals.equipmentId, req.equipmentId), ne(rentals.status, "returned")))
        .limit(1);
      if (open.length) {
        throw new Error("This equipment already has an active rental");
      }

      const decided = await tx
        .update(rentalRequests)
        .set({
          status: "approved",
          decidedById: opts.managerId,
          decidedAt: new Date(),
          note: opts.note,
        })
        .where(and(eq(rentalRequests.id, opts.requestId), eq(rentalRequests.status, "pending")))
        .returning({ id: rentalRequests.id });

      if (!decided.length) {
        throw new Error("Request not found or already decided");
      }

      const reserved = await tx
        .update(equipment)
        .set({ status: "reserved", updatedAt: new Date() })
        .where(and(eq(equipment.id, req.equipmentId), eq(equipment.status, "requested")))
        .returning({ id: equipment.id });

      if (!reserved.length) {
        throw new Error("Equipment state conflict — cannot approve");
      }

      await tx.insert(rentals).values({
        id: id(),
        equipmentId: req.equipmentId,
        userId: req.userId,
        requestId: req.id,
        status: "active",
        scheduledPickupAt: req.preferredPickupAt,
        scheduledReturnAt: req.preferredReturnAt,
        pickupAvailability: parseAvailability(req.pickupAvailability),
        returnAvailability: parseAvailability(req.returnAvailability),
      });
    } else {
      const decided = await tx
        .update(rentalRequests)
        .set({
          status: "denied",
          decidedById: opts.managerId,
          decidedAt: new Date(),
          note: opts.note,
        })
        .where(and(eq(rentalRequests.id, opts.requestId), eq(rentalRequests.status, "pending")))
        .returning({ id: rentalRequests.id });

      if (!decided.length) {
        throw new Error("Request not found or already decided");
      }

      await tx
        .update(equipment)
        .set({ status: "available", updatedAt: new Date() })
        .where(eq(equipment.id, req.equipmentId));
    }
  });

  if (opts.approve) {
    if (renterEmail && renterName) {
      await sendEmail({
        to: renterEmail,
        subject: `${APP_NAME}: request approved — ${itemName}`,
        text: `Hi ${renterName},\n\nYour request for "${itemName}" was approved.${opts.note?.trim() ? `\n\nManager note: ${opts.note.trim()}` : ""}\n\nA manager will coordinate pickup with you — they must confirm checkout in the app.\n\n${APP_URL}/my-rentals`,
      });
    }
  } else {
    if (renterEmail && renterName) {
      await sendEmail({
        to: renterEmail,
        subject: `${APP_NAME}: request denied — ${itemName}`,
        text: `Hi ${renterName},\n\nYour request for "${itemName}" was denied.${opts.note?.trim() ? `\n\nManager note: ${opts.note.trim()}` : ""}\n\nYou can browse other gear here: ${APP_URL}/gear`,
      });
    }
    await notifyNextWaitlist(equipmentId);
  }
}

export async function confirmPickup(opts: {
  rentalId: string;
  managerId: string;
}) {
  const [rental] = await db
    .select()
    .from(rentals)
    .where(eq(rentals.id, opts.rentalId))
    .limit(1);

  if (!rental || rental.pickedUpAt || rental.returnedAt) {
    throw new Error("Rental not ready for pickup");
  }

  let days = DEFAULT_RENTAL_DAYS;
  if (rental.requestId) {
    const [req] = await db
      .select({ requestedDays: rentalRequests.requestedDays })
      .from(rentalRequests)
      .where(eq(rentalRequests.id, rental.requestId))
      .limit(1);
    if (req?.requestedDays) days = req.requestedDays;
  }

  const now = new Date();
  const dueAt = addDays(now, days);

  const updated = await db
    .update(rentals)
    .set({
      pickedUpAt: now,
      dueAt,
      status: "active",
    })
    .where(and(eq(rentals.id, opts.rentalId), isNull(rentals.pickedUpAt), isNull(rentals.returnedAt)))
    .returning({ id: rentals.id });

  if (!updated.length) {
    throw new Error("Rental not ready for pickup");
  }

  await db
    .update(equipment)
    .set({ status: "checked_out", updatedAt: now })
    .where(eq(equipment.id, rental.equipmentId));

  const [item] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, rental.equipmentId))
    .limit(1);

  const [renter] = await db
    .select()
    .from(user)
    .where(eq(user.id, rental.userId))
    .limit(1);

  if (renter) {
    await sendEmail({
      to: renter.email,
      subject: `${APP_NAME}: checked out — ${item?.name}`,
      text: `Hi ${renter.name},\n\n"${item?.name}" was checked out to you.\n\nDue: ${formatDate(dueAt)}\n\nReturn with a manager before the due date. Track it: ${APP_URL}/my-rentals`,
    });
  }

  void opts.managerId;
}

export async function confirmReturn(opts: { rentalId: string; managerId: string }) {
  const [rental] = await db
    .select()
    .from(rentals)
    .where(eq(rentals.id, opts.rentalId))
    .limit(1);

  if (!rental || !rental.pickedUpAt || rental.returnedAt) {
    throw new Error("Rental not ready for return");
  }

  const [item] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, rental.equipmentId))
    .limit(1);

  const [renter] = await db
    .select()
    .from(user)
    .where(eq(user.id, rental.userId))
    .limit(1);

  const now = new Date();

  await db.transaction(async (tx) => {
    const returned = await tx
      .update(rentals)
      .set({ returnedAt: now, status: "returned" })
      .where(
        and(
          eq(rentals.id, opts.rentalId),
          isNotNull(rentals.pickedUpAt),
          isNull(rentals.returnedAt),
        ),
      )
      .returning({ id: rentals.id });

    if (!returned.length) {
      throw new Error("Rental not ready for return");
    }

    // Cancel any pending extensions so they can't resurrect this rental
    await tx
      .update(extensionRequests)
      .set({
        status: "denied",
        decidedById: opts.managerId,
        decidedAt: now,
      })
      .where(
        and(eq(extensionRequests.rentalId, opts.rentalId), eq(extensionRequests.status, "pending")),
      );

    await tx
      .update(equipment)
      .set({ status: "available", updatedAt: now })
      .where(eq(equipment.id, rental.equipmentId));

    await tx.insert(rentalHistory).values({
      id: id(),
      rentalId: rental.id,
      equipmentId: rental.equipmentId,
      equipmentName: item?.name ?? "Unknown",
      userId: rental.userId,
      userName: renter?.name ?? "",
      userEmail: renter?.email ?? "",
      userNetid: renter?.netid ?? "",
      pickedUpAt: rental.pickedUpAt,
      dueAt: rental.dueAt,
      returnedAt: now,
      extensionCount: rental.extensionCount,
    });
  });

  if (renter) {
    await sendEmail({
      to: renter.email,
      subject: `${APP_NAME}: returned — ${item?.name}`,
      text: `Hi ${renter.name},\n\nThanks — "${item?.name}" was marked returned.\n\nBrowse gear again: ${APP_URL}/gear`,
    });
  }

  await notifyNextWaitlist(rental.equipmentId);
}

export async function updateRentalSchedule(opts: {
  rentalId: string;
  userId: string;
  kind: "pickup" | "return";
  availability: AvailabilityRange[];
}) {
  const ranges = parseAvailability(opts.availability);
  if (!ranges.length) {
    throw new Error("Select at least one time window");
  }

  const [rental] = await db
    .select()
    .from(rentals)
    .where(and(eq(rentals.id, opts.rentalId), eq(rentals.userId, opts.userId)))
    .limit(1);

  if (!rental || rental.returnedAt) {
    throw new Error("Rental not found");
  }

  if (opts.kind === "pickup") {
    throw new Error("Pickup availability is set when you submit the request");
  }

  if (!rental.pickedUpAt) {
    throw new Error("Schedule return after the gear is checked out");
  }

  const earliest = earliestStart(ranges)!;
  if (earliest.getTime() < Date.now() - 60_000) {
    throw new Error("Include at least one window that starts in the future");
  }

  {
    const pickupRanges = parseAvailability(rental.pickupAvailability);
    if (pickupRanges.length && earliest <= earliestStart(pickupRanges)!) {
      throw new Error("Return windows must start after your pickup availability");
    }
    await db
      .update(rentals)
      .set({
        returnAvailability: ranges,
        scheduledReturnAt: earliest,
      })
      .where(eq(rentals.id, rental.id));
    if (rental.requestId) {
      await db
        .update(rentalRequests)
        .set({
          returnAvailability: ranges,
          preferredReturnAt: earliest,
        })
        .where(eq(rentalRequests.id, rental.requestId));
    }
  }

  const [item] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, rental.equipmentId))
    .limit(1);

  const [renter] = await db
    .select()
    .from(user)
    .where(eq(user.id, opts.userId))
    .limit(1);

  await notifyManagers({
    subject: `${APP_NAME}: return availability — ${item?.name}`,
    text: `${renter?.name ?? "A member"} (${renter?.email}) updated return availability for "${item?.name}":\n${formatAvailabilityList(ranges)}\n\n${APP_URL}/manager`,
    discordTitle: `Return availability — ${item?.name}`,
    excludeEmails: renter?.email ? [renter.email] : [],
  });
}

export async function requestExtension(opts: { rentalId: string; userId: string }) {
  type ExtResult =
    | { auto: true; dueAt: Date; itemName?: string; renterEmail?: string; renterName?: string }
    | {
        auto: false;
        extensionId: string;
        itemName?: string;
        renterEmail?: string;
        renterName?: string;
      };

  const result = await db.transaction(async (tx): Promise<ExtResult> => {
    const [rental] = await tx
      .select()
      .from(rentals)
      .where(and(eq(rentals.id, opts.rentalId), eq(rentals.userId, opts.userId)))
      .for("update")
      .limit(1);

    if (!rental || !rental.dueAt || rental.returnedAt) {
      throw new Error("Rental not found");
    }

    if (rental.status === "overdue") {
      throw new Error("Return overdue gear before requesting an extension");
    }

    const waiters = await tx
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.equipmentId, rental.equipmentId))
      .limit(1);

    if (waiters.length) {
      throw new Error(
        "Someone is on the waitlist for this item, so extensions aren’t available. Please return on time.",
      );
    }

    const pending = await tx
      .select({ id: extensionRequests.id })
      .from(extensionRequests)
      .where(
        and(
          eq(extensionRequests.rentalId, opts.rentalId),
          eq(extensionRequests.status, "pending"),
        ),
      )
      .limit(1);

    if (pending.length) throw new Error("An extension request is already pending");

    const [item] = await tx
      .select()
      .from(equipment)
      .where(eq(equipment.id, rental.equipmentId))
      .limit(1);

    const [renter] = await tx
      .select()
      .from(user)
      .where(eq(user.id, opts.userId))
      .limit(1);

    const meta = {
      itemName: item?.name,
      renterEmail: renter?.email,
      renterName: renter?.name,
    };

    if (rental.extensionCount === 0) {
      const newDue = addDays(rental.dueAt, DEFAULT_RENTAL_DAYS);
      await tx
        .update(rentals)
        .set({
          dueAt: newDue,
          extensionCount: 1,
          status: "active",
          dueSoonSentAt: null,
        })
        .where(and(eq(rentals.id, opts.rentalId), isNull(rentals.returnedAt)));

      await tx.insert(extensionRequests).values({
        id: id(),
        rentalId: opts.rentalId,
        status: "auto_approved",
        decidedAt: new Date(),
      });

      return { auto: true, dueAt: newDue, ...meta };
    }

    const extId = id();
    await tx.insert(extensionRequests).values({
      id: extId,
      rentalId: opts.rentalId,
      status: "pending",
    });
    return { auto: false, extensionId: extId, ...meta };
  });

  if (result.auto) {
    if (result.renterEmail && result.renterName) {
      await sendEmail({
        to: result.renterEmail,
        subject: `${APP_NAME}: extension approved — ${result.itemName}`,
        text: `Hi ${result.renterName},\n\nYour first extension for "${result.itemName}" was automatically approved.\n\nNew due date: ${formatDate(result.dueAt)}\n\n${APP_URL}/my-rentals`,
      });
    }
    return { auto: true as const, dueAt: result.dueAt };
  }

  await notifyManagers({
    subject: `${APP_NAME}: extension request — ${result.itemName}`,
    text: `${result.renterName ?? "A member"} (${result.renterEmail ?? "—"}) requested a further extension for "${result.itemName}".\n\nReview: ${APP_URL}/manager`,
    discordTitle: `Extension request — ${result.itemName}`,
    excludeEmails: result.renterEmail ? [result.renterEmail] : [],
  });

  if (result.renterEmail && result.renterName) {
    await sendEmail({
      to: result.renterEmail,
      subject: `${APP_NAME}: extension requested — ${result.itemName}`,
      text: `Hi ${result.renterName},\n\nWe received your further extension request for "${result.itemName}". A manager will review it and email you with the decision.\n\n${APP_URL}/my-rentals`,
    });
  }

  return { auto: false as const, extensionId: result.extensionId };
}

export async function decideExtension(opts: {
  extensionId: string;
  managerId: string;
  approve: boolean;
}) {
  let itemName: string | undefined;
  let renterEmail: string | undefined;
  let renterName: string | undefined;
  let newDue: Date | undefined;
  let dueAt: Date | undefined;

  await db.transaction(async (tx) => {
    const [ext] = await tx
      .select()
      .from(extensionRequests)
      .where(eq(extensionRequests.id, opts.extensionId))
      .for("update")
      .limit(1);

    if (!ext || ext.status !== "pending") {
      throw new Error("Extension not found or already decided");
    }

    const [rental] = await tx
      .select()
      .from(rentals)
      .where(eq(rentals.id, ext.rentalId))
      .for("update")
      .limit(1);

    if (!rental?.dueAt) throw new Error("Rental missing");
    if (rental.returnedAt || rental.status === "returned") {
      await tx
        .update(extensionRequests)
        .set({
          status: "denied",
          decidedById: opts.managerId,
          decidedAt: new Date(),
        })
        .where(eq(extensionRequests.id, opts.extensionId));
      throw new Error("Rental already returned — extension cancelled");
    }

    dueAt = rental.dueAt;

    const [renter] = await tx
      .select()
      .from(user)
      .where(eq(user.id, rental.userId))
      .limit(1);

    const [item] = await tx
      .select()
      .from(equipment)
      .where(eq(equipment.id, rental.equipmentId))
      .limit(1);

    itemName = item?.name;
    renterEmail = renter?.email;
    renterName = renter?.name;

    if (opts.approve) {
      const waiters = await tx
        .select({ id: waitlistEntries.id })
        .from(waitlistEntries)
        .where(eq(waitlistEntries.equipmentId, rental.equipmentId))
        .limit(1);
      if (waiters.length) {
        throw new Error("Cannot approve extension — someone is on the waitlist for this item");
      }

      newDue = addDays(rental.dueAt, DEFAULT_RENTAL_DAYS);
      await tx
        .update(rentals)
        .set({
          dueAt: newDue,
          extensionCount: rental.extensionCount + 1,
          status: "active",
          dueSoonSentAt: null,
        })
        .where(and(eq(rentals.id, rental.id), isNull(rentals.returnedAt)));

      await tx
        .update(extensionRequests)
        .set({
          status: "approved",
          decidedById: opts.managerId,
          decidedAt: new Date(),
        })
        .where(
          and(eq(extensionRequests.id, opts.extensionId), eq(extensionRequests.status, "pending")),
        );
    } else {
      await tx
        .update(extensionRequests)
        .set({
          status: "denied",
          decidedById: opts.managerId,
          decidedAt: new Date(),
        })
        .where(
          and(eq(extensionRequests.id, opts.extensionId), eq(extensionRequests.status, "pending")),
        );
    }
  });

  if (opts.approve) {
    if (renterEmail && renterName && newDue) {
      await sendEmail({
        to: renterEmail,
        subject: `${APP_NAME}: extension approved — ${itemName}`,
        text: `Hi ${renterName},\n\nYour extension for "${itemName}" was approved. New due date: ${formatDate(newDue)}.\n\n${APP_URL}/my-rentals`,
      });
    }
  } else if (renterEmail && renterName && dueAt) {
    await sendEmail({
      to: renterEmail,
      subject: `${APP_NAME}: extension denied — ${itemName}`,
      text: `Hi ${renterName},\n\nYour further extension for "${itemName}" was denied. Please return by ${formatDate(dueAt)}.\n\n${APP_URL}/my-rentals`,
    });
  }
}

export async function getActiveWaitlistOffer(equipmentId: string) {
  const now = new Date();
  const [row] = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.equipmentId, equipmentId),
        isNotNull(waitlistEntries.offerExpiresAt),
        gt(waitlistEntries.offerExpiresAt, now),
      ),
    )
    .orderBy(asc(waitlistEntries.position))
    .limit(1);
  return row ?? null;
}

async function reindexWaitlist(equipmentId: string) {
  const remaining = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.equipmentId, equipmentId))
    .orderBy(asc(waitlistEntries.position), asc(waitlistEntries.createdAt));

  for (let i = 0; i < remaining.length; i++) {
    await db
      .update(waitlistEntries)
      .set({ position: i + 1 })
      .where(eq(waitlistEntries.id, remaining[i].id));
  }
}

export async function joinWaitlist(opts: { equipmentId: string; userId: string }) {
  if (await userHasOverdue(opts.userId)) {
    throw new Error("You have overdue gear. Return it before joining a waitlist.");
  }

  await db.transaction(async (tx) => {
    const [item] = await tx
      .select()
      .from(equipment)
      .where(eq(equipment.id, opts.equipmentId))
      .for("update")
      .limit(1);

    if (!item) throw new Error("Equipment not found");
    if (item.status === "available" || item.status === "retired" || item.status === "repair") {
      throw new Error("Waitlist is only for unavailable rentable gear");
    }

    const pendingRequest = await tx
      .select({ id: rentalRequests.id })
      .from(rentalRequests)
      .where(
        and(
          eq(rentalRequests.equipmentId, opts.equipmentId),
          eq(rentalRequests.userId, opts.userId),
          eq(rentalRequests.status, "pending"),
        ),
      )
      .limit(1);

    if (pendingRequest.length) {
      throw new Error("You already requested this item");
    }

    const activeRental = await tx
      .select({ id: rentals.id })
      .from(rentals)
      .where(
        and(
          eq(rentals.equipmentId, opts.equipmentId),
          eq(rentals.userId, opts.userId),
          ne(rentals.status, "returned"),
        ),
      )
      .limit(1);

    if (activeRental.length) {
      throw new Error("You already have this item reserved or checked out");
    }

    const existing = await tx
      .select({ id: waitlistEntries.id })
      .from(waitlistEntries)
      .where(
        and(
          eq(waitlistEntries.equipmentId, opts.equipmentId),
          eq(waitlistEntries.userId, opts.userId),
        ),
      )
      .limit(1);

    if (existing.length) throw new Error("You are already on this waitlist");

    const [{ maxPos }] = await tx
      .select({ maxPos: sql<number>`coalesce(max(${waitlistEntries.position}), 0)::int` })
      .from(waitlistEntries)
      .where(eq(waitlistEntries.equipmentId, opts.equipmentId));

    await tx.insert(waitlistEntries).values({
      id: id(),
      equipmentId: opts.equipmentId,
      userId: opts.userId,
      position: Number(maxPos) + 1,
    });
  });
}

/** Offer the item to the next waiter for WAITLIST_OFFER_HOURS (does not remove them until they claim or expire). */
export async function notifyNextWaitlist(equipmentId: string) {
  const now = new Date();

  // If someone already holds an active offer, don't double-offer
  const existingOffer = await getActiveWaitlistOffer(equipmentId);
  if (existingOffer) return existingOffer.id;

  // Clear any expired offers first
  await expireOffersForEquipment(equipmentId);

  const [next] = await db
    .select({
      entry: waitlistEntries,
      email: user.email,
      name: user.name,
      gearName: equipment.name,
    })
    .from(waitlistEntries)
    .innerJoin(user, eq(waitlistEntries.userId, user.id))
    .innerJoin(equipment, eq(waitlistEntries.equipmentId, equipment.id))
    .where(
      and(
        eq(waitlistEntries.equipmentId, equipmentId),
        isNull(waitlistEntries.offerExpiresAt),
      ),
    )
    .orderBy(asc(waitlistEntries.position))
    .limit(1);

  const target =
    next ??
    (
      await db
        .select({
          entry: waitlistEntries,
          email: user.email,
          name: user.name,
          gearName: equipment.name,
        })
        .from(waitlistEntries)
        .innerJoin(user, eq(waitlistEntries.userId, user.id))
        .innerJoin(equipment, eq(waitlistEntries.equipmentId, equipment.id))
        .where(eq(waitlistEntries.equipmentId, equipmentId))
        .orderBy(asc(waitlistEntries.position))
        .limit(1)
    )[0];

  if (!target) return null;

  const expires = addHours(now, WAITLIST_OFFER_HOURS);
  await db
    .update(waitlistEntries)
    .set({ notifiedAt: now, offerExpiresAt: expires })
    .where(eq(waitlistEntries.id, target.entry.id));

  await sendEmail({
    to: target.email,
    subject: `${APP_NAME}: "${target.gearName}" is available — confirm within 24 hours`,
    text: `Hi ${target.name},\n\n"${target.gearName}" is available and you are next on the waitlist.\n\nYou have 24 hours to confirm your waitlist request (by ${formatDateTime(expires)}):\n${APP_URL}/gear\n\nAfter that, the offer goes to the next person.\n\nTrack waitlist: ${APP_URL}/my-rentals`,
  });

  return target.entry.id;
}

async function expireOffersForEquipment(equipmentId: string) {
  const now = new Date();
  const expired = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(
        eq(waitlistEntries.equipmentId, equipmentId),
        isNotNull(waitlistEntries.offerExpiresAt),
        lt(waitlistEntries.offerExpiresAt, now),
      ),
    );

  for (const entry of expired) {
    await db.delete(waitlistEntries).where(eq(waitlistEntries.id, entry.id));
  }
  if (expired.length) await reindexWaitlist(equipmentId);
  return expired.length;
}

/** Expire all past waitlist offers and advance the queue. */
export async function processWaitlistOffers() {
  const now = new Date();
  const expired = await db
    .select()
    .from(waitlistEntries)
    .where(
      and(isNotNull(waitlistEntries.offerExpiresAt), lt(waitlistEntries.offerExpiresAt, now)),
    );

  const equipmentIds = [...new Set(expired.map((e) => e.equipmentId))];

  for (const entry of expired) {
    const [u] = await db.select().from(user).where(eq(user.id, entry.userId)).limit(1);
    const [item] = await db
      .select()
      .from(equipment)
      .where(eq(equipment.id, entry.equipmentId))
      .limit(1);
    if (u && item) {
      await sendEmail({
        to: u.email,
        subject: `${APP_NAME}: waitlist offer expired — ${item.name}`,
        text: `Hi ${u.name},\n\nYour 24-hour window to confirm "${item.name}" ended, so the offer moved to the next person on the waitlist.\n\n${APP_URL}/gear`,
      });
    }
    await db.delete(waitlistEntries).where(eq(waitlistEntries.id, entry.id));
  }

  for (const equipmentId of equipmentIds) {
    await reindexWaitlist(equipmentId);
    const [item] = await db
      .select()
      .from(equipment)
      .where(eq(equipment.id, equipmentId))
      .limit(1);
    // Offer next waiter while item is free — keeps the exclusive window continuous
    if (item?.status === "available") {
      await notifyNextWaitlist(equipmentId);
    }
  }

  return expired.length;
}

export async function equipmentHasWaitlist(equipmentId: string) {
  const rows = await db
    .select({ id: waitlistEntries.id })
    .from(waitlistEntries)
    .where(eq(waitlistEntries.equipmentId, equipmentId))
    .limit(1);
  return rows.length > 0;
}

export async function setEquipmentManagerStatus(opts: {
  equipmentId: string;
  status: "available" | "repair" | "retired";
}) {
  const [item] = await db
    .select()
    .from(equipment)
    .where(eq(equipment.id, opts.equipmentId))
    .limit(1);

  if (!item) throw new Error("Not found");
  if (
    item.status === "requested" ||
    item.status === "reserved" ||
    item.status === "checked_out"
  ) {
    throw new Error("Finish or cancel active rental workflow before changing status");
  }

  await db
    .update(equipment)
    .set({ status: opts.status, updatedAt: new Date() })
    .where(eq(equipment.id, opts.equipmentId));

  if (opts.status === "available") {
    await notifyNextWaitlist(opts.equipmentId);
  }
}

export async function sendDueSoonReminders() {
  const soon = addDays(new Date(), 1);
  const now = new Date();
  const cooldown = subHours(now, 20);

  const rows = await db
    .select({
      id: rentals.id,
      email: user.email,
      name: user.name,
      gearName: equipment.name,
      dueAt: rentals.dueAt,
      dueSoonSentAt: rentals.dueSoonSentAt,
    })
    .from(rentals)
    .innerJoin(user, eq(rentals.userId, user.id))
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .where(
      and(
        eq(rentals.status, "active"),
        isNotNull(rentals.pickedUpAt),
        isNotNull(rentals.dueAt),
        gt(rentals.dueAt, now),
        lt(rentals.dueAt, soon),
      ),
    );

  let sent = 0;
  for (const row of rows) {
    if (!row.dueAt) continue;
    if (row.dueSoonSentAt && row.dueSoonSentAt > cooldown) continue;

    await sendEmail({
      to: row.email,
      subject: `${APP_NAME}: due soon — ${row.gearName}`,
      text: `Hi ${row.name},\n\n"${row.gearName}" is due ${formatDateTime(row.dueAt)}. Arrange return with a manager.\n\n${APP_URL}/my-rentals`,
    });

    await db
      .update(rentals)
      .set({ dueSoonSentAt: now })
      .where(eq(rentals.id, row.id));
    sent += 1;
  }

  return sent;
}
