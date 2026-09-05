import { and, asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { equipment, rentals, rentalRequests, waitlistEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth-server";
import { ActionButton } from "@/components/action-button";
import { AvailabilityReadout } from "@/components/availability-grid";
import { RequestGearButton } from "@/components/request-gear-button";
import { ScheduleRentalTimeButton } from "@/components/schedule-rental-time-button";
import { coerceAvailability } from "@/lib/availability-ui";
import {
  equipmentHasWaitlist,
  getActiveWaitlistOffer,
  notifyNextWaitlist,
} from "@/lib/rentals";

export default async function MyRentalsPage() {
  const session = await requireUser({ next: "/my-rentals" });

  const myRequests = await db
    .select({
      request: rentalRequests,
      gearName: equipment.name,
      gearStatus: equipment.status,
    })
    .from(rentalRequests)
    .innerJoin(equipment, eq(rentalRequests.equipmentId, equipment.id))
    .where(eq(rentalRequests.userId, session.user.id))
    .orderBy(desc(rentalRequests.requestedAt));

  const myRentals = await db
    .select({
      rental: rentals,
      gearName: equipment.name,
      equipmentId: equipment.id,
    })
    .from(rentals)
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .where(
      and(eq(rentals.userId, session.user.id), ne(rentals.status, "returned")),
    )
    .orderBy(desc(rentals.createdAt));

  const waitlistBlocked = new Map<string, boolean>();
  for (const row of myRentals) {
    waitlistBlocked.set(row.equipmentId, await equipmentHasWaitlist(row.equipmentId));
  }

  let myWaitlist = await db
    .select({
      entry: waitlistEntries,
      gearName: equipment.name,
      gearStatus: equipment.status,
      equipmentId: equipment.id,
    })
    .from(waitlistEntries)
    .innerJoin(equipment, eq(waitlistEntries.equipmentId, equipment.id))
    .where(eq(waitlistEntries.userId, session.user.id))
    .orderBy(asc(waitlistEntries.position));

  // Open 24h offers for anything that's available but still waitlisted
  for (const row of myWaitlist) {
    if (row.gearStatus === "available") {
      const offer = await getActiveWaitlistOffer(row.equipmentId);
      if (!offer) await notifyNextWaitlist(row.equipmentId);
    }
  }

  myWaitlist = await db
    .select({
      entry: waitlistEntries,
      gearName: equipment.name,
      gearStatus: equipment.status,
      equipmentId: equipment.id,
    })
    .from(waitlistEntries)
    .innerJoin(equipment, eq(waitlistEntries.equipmentId, equipment.id))
    .where(eq(waitlistEntries.userId, session.user.id))
    .orderBy(asc(waitlistEntries.position));

  const availability = new Map<string, Date | null>();
  for (const row of myWaitlist) {
    if (row.gearStatus === "available") {
      availability.set(row.equipmentId, new Date());
      continue;
    }
    const [active] = await db
      .select({ dueAt: rentals.dueAt })
      .from(rentals)
      .where(
        and(
          eq(rentals.equipmentId, row.equipmentId),
          ne(rentals.status, "returned"),
        ),
      )
      .orderBy(desc(rentals.createdAt))
      .limit(1);
    availability.set(row.equipmentId, active?.dueAt ?? null);
  }

  return (
    <main className="page">
      <h1 className="brand" style={{ fontSize: "2.8rem" }}>
        My rentals
      </h1>
      <p className="muted">Active checkouts, requests, waitlist, and extensions.</p>

      <section style={{ marginTop: "2rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Active
        </h2>
        {myRentals.length === 0 ? (
          <p className="muted">No active rentals.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Gear</th>
                <th>Status</th>
                <th>Due</th>
                <th>Schedule</th>
                <th>Extend</th>
              </tr>
            </thead>
            <tbody>
              {myRentals.map(({ rental, gearName, equipmentId }) => {
                const blocked = waitlistBlocked.get(equipmentId);
                const pickupWindows = coerceAvailability(
                  rental.pickupAvailability,
                  rental.scheduledPickupAt,
                );
                const returnWindows = coerceAvailability(
                  rental.returnAvailability,
                  rental.scheduledReturnAt,
                );
                const canScheduleReturn = Boolean(rental.pickedUpAt);
                return (
                  <tr key={rental.id}>
                    <td>{gearName}</td>
                    <td>
                      {!rental.pickedUpAt
                        ? "Awaiting pickup"
                        : rental.status === "overdue"
                          ? "Overdue"
                          : "Checked out"}
                      {rental.extensionCount > 0 ? ` · ${rental.extensionCount} ext` : ""}
                      {!rental.pickedUpAt ? (
                        <div style={{ marginTop: "0.35rem" }}>
                          <AvailabilityReadout label="Pickup" ranges={pickupWindows} />
                        </div>
                      ) : null}
                      <div style={{ marginTop: "0.35rem" }}>
                        <AvailabilityReadout label="Return" ranges={returnWindows} />
                      </div>
                    </td>
                    <td>{rental.dueAt ? rental.dueAt.toLocaleDateString() : "—"}</td>
                    <td className="row">
                      {canScheduleReturn ? (
                        <ScheduleRentalTimeButton
                          rentalId={rental.id}
                          kind="return"
                          gearName={gearName}
                          initialAvailability={returnWindows}
                        />
                      ) : (
                        <span className="muted" style={{ fontSize: "0.85rem" }}>
                          Available after pickup
                        </span>
                      )}
                    </td>
                    <td>
                      {rental.pickedUpAt && rental.status !== "overdue" ? (
                        blocked ? (
                          <span className="muted" style={{ fontSize: "0.85rem" }}>
                            Extensions blocked — someone is on the waitlist
                          </span>
                        ) : (
                          <ActionButton
                            label={
                              rental.extensionCount === 0
                                ? "Extend +7 days"
                                : "Request extension"
                            }
                            variant="ghost"
                            confirm={
                              rental.extensionCount === 0
                                ? "Automatically extend this rental by 7 days? (First extension is free — no manager approval needed.)"
                                : "Submit an extension request for manager approval?"
                            }
                            body={{ action: "extend", rentalId: rental.id }}
                          />
                        )
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Waitlist
        </h2>
        {myWaitlist.length === 0 ? (
          <p className="muted">You’re not on any waitlists.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Gear</th>
                <th>Position</th>
                <th>Available</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {myWaitlist.map(({ entry, gearName, gearStatus, equipmentId }) => {
                const avail = availability.get(equipmentId);
                const offerLive =
                  entry.offerExpiresAt && entry.offerExpiresAt > new Date();
                return (
                  <tr key={entry.id}>
                    <td>{gearName}</td>
                    <td>#{entry.position}</td>
                    <td>
                      {gearStatus === "available"
                        ? "Available now"
                        : avail
                          ? `Est. ${avail.toLocaleDateString()}`
                          : "TBD"}
                    </td>
                    <td>
                      {offerLive
                        ? `Confirm by ${entry.offerExpiresAt!.toLocaleString()}`
                        : gearStatus === "available"
                          ? "Waiting for offer"
                          : "Waiting"}
                    </td>
                    <td>
                      {offerLive ? (
                        <RequestGearButton
                          equipmentId={equipmentId}
                          equipmentName={gearName}
                          mode="waitlist-confirm"
                          offerExpiresAt={entry.offerExpiresAt!.toISOString()}
                        />
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Requests
        </h2>
        {myRequests.length === 0 ? (
          <p className="muted">No requests yet.</p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Gear</th>
                <th>Status</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {myRequests.map(({ request, gearName }) => {
                const pickupWindows = coerceAvailability(
                  request.pickupAvailability,
                  request.preferredPickupAt,
                );
                const returnWindows = coerceAvailability(
                  request.returnAvailability,
                  request.preferredReturnAt,
                );
                return (
                <tr key={request.id}>
                  <td>{gearName}</td>
                  <td>{request.status}</td>
                  <td style={{ fontSize: "0.9rem" }}>
                    <div>{request.requestedAt.toLocaleString()}</div>
                    <div style={{ marginTop: "0.35rem" }}>
                      <AvailabilityReadout label="Pickup" ranges={pickupWindows} />
                    </div>
                    <div style={{ marginTop: "0.35rem" }}>
                      <AvailabilityReadout label="Return" ranges={returnWindows} />
                    </div>
                    <div className="muted">
                      {request.needsTraining ? "Needs training" : null}
                    </div>
                    {request.renterNotes ? (
                      <div className="muted">{request.renterNotes}</div>
                    ) : null}
                  </td>
                </tr>
              );
              })}
            </tbody>
          </table>
        )}
      </section>
    </main>
  );
}
