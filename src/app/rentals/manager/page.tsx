import Link from "next/link";
import { asc, desc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  equipment,
  extensionRequests,
  rentalRequests,
  rentals,
  user,
  waitlistEntries,
} from "@/db/schema";
import { requireManager } from "@/lib/auth-server";
import { ActionButton } from "@/components/action-button";
import { AddEquipmentForm } from "@/components/add-equipment-form";
import { PromoteManagerForm } from "@/components/promote-manager-form";
import { InventorySpreadsheet } from "@/components/inventory-spreadsheet";
import { DecideRequestControls } from "@/components/decide-request-controls";
import { MemberControls } from "@/components/member-controls";
import { DiscordNotifyControls } from "@/components/discord-notify-controls";
import { AvailabilityReadout } from "@/components/availability-grid";
import { coerceAvailability } from "@/lib/availability-ui";
import { formatDate } from "@/lib/datetime";

export default async function ManagerPage() {
  const session = await requireManager();

  const members = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      netid: user.netid,
      emailVerified: user.emailVerified,
      isMember: user.isMember,
      isManager: user.isManager,
      createdAt: user.createdAt,
    })
    .from(user)
    .orderBy(asc(user.name));

  const pendingRequests = await db
    .select({
      request: rentalRequests,
      gearName: equipment.name,
      renterName: user.name,
      renterEmail: user.email,
      renterNetid: user.netid,
      renterIsMember: user.isMember,
    })
    .from(rentalRequests)
    .innerJoin(equipment, eq(rentalRequests.equipmentId, equipment.id))
    .innerJoin(user, eq(rentalRequests.userId, user.id))
    .where(eq(rentalRequests.status, "pending"))
    .orderBy(desc(rentalRequests.requestedAt));

  const activeRentals = await db
    .select({
      rental: rentals,
      gearName: equipment.name,
      renterName: user.name,
      renterNetid: user.netid,
      renterIsMember: user.isMember,
    })
    .from(rentals)
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .innerJoin(user, eq(rentals.userId, user.id))
    .where(ne(rentals.status, "returned"))
    .orderBy(desc(rentals.createdAt));

  const pendingExtensions = await db
    .select({
      ext: extensionRequests,
      gearName: equipment.name,
      renterName: user.name,
      dueAt: rentals.dueAt,
    })
    .from(extensionRequests)
    .innerJoin(rentals, eq(extensionRequests.rentalId, rentals.id))
    .innerJoin(equipment, eq(rentals.equipmentId, equipment.id))
    .innerJoin(user, eq(rentals.userId, user.id))
    .where(eq(extensionRequests.status, "pending"))
    .orderBy(desc(extensionRequests.requestedAt));

  const waitlist = await db
    .select({
      entry: waitlistEntries,
      gearName: equipment.name,
      gearStatus: equipment.status,
      renterName: user.name,
      renterEmail: user.email,
      renterNetid: user.netid,
    })
    .from(waitlistEntries)
    .innerJoin(equipment, eq(waitlistEntries.equipmentId, equipment.id))
    .innerJoin(user, eq(waitlistEntries.userId, user.id))
    .orderBy(asc(equipment.name), asc(waitlistEntries.position));

  const inventory = await db.select().from(equipment).orderBy(desc(equipment.createdAt));
  const now = new Date();

  return (
    <main className="page manager-page">
      <h1 className="brand" style={{ fontSize: "clamp(2rem, 8vw, 2.8rem)" }}>
        Manager
      </h1>

      <nav className="manager-jump" aria-label="Manager sections">
        <a href="#pending-requests">Requests ({pendingRequests.length})</a>
        <a href="#pickups-returns">Pickups ({activeRentals.length})</a>
        <a href="#extensions">Extensions ({pendingExtensions.length})</a>
        <a href="#waitlists">Waitlists ({waitlist.length})</a>
        <a href="#members">Accounts ({members.length})</a>
        <a href="#inventory">Inventory ({inventory.length})</a>
        <Link href="/admin">Site admin</Link>
      </nav>

      <section id="pending-requests" style={{ marginTop: "2rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Pending requests
        </h2>
        {pendingRequests.length === 0 ? (
          <p className="muted">No pending requests.</p>
        ) : (
          <div className="manager-list">
            {pendingRequests.map((row) => {
              const pickupWindows = coerceAvailability(
                row.request.pickupAvailability,
                row.request.preferredPickupAt,
              );
              const returnWindows = coerceAvailability(
                row.request.returnAvailability,
                row.request.preferredReturnAt,
              );
              return (
                <article key={row.request.id} className="manager-card panel">
                  <div className="manager-card-top">
                    <h3>{row.gearName}</h3>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      {row.renterName}{" "}
                      {row.renterIsMember ? (
                        <span className="badge badge-ok">Club member</span>
                      ) : (
                        <span className="badge">Non-member</span>
                      )}
                      <div>
                        {row.renterNetid} · {row.renterEmail}
                      </div>
                    </div>
                  </div>
                  <div className="manager-card-body">
                    <AvailabilityReadout label="Pickup" ranges={pickupWindows} />
                    <AvailabilityReadout label="Return" ranges={returnWindows} />
                    <div style={{ fontSize: "0.9rem" }}>
                      Training: {row.request.needsTraining ? "yes" : "no"}
                    </div>
                    {row.request.renterNotes ? (
                      <div className="muted" style={{ fontSize: "0.9rem" }}>
                        {row.request.renterNotes}
                      </div>
                    ) : null}
                  </div>
                  <DecideRequestControls requestId={row.request.id} />
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="pickups-returns" style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Pickups & returns
        </h2>
        {activeRentals.length === 0 ? (
          <p className="muted">No active rentals.</p>
        ) : (
          <div className="manager-list">
            {activeRentals.map((row) => {
              const pickupWindows = coerceAvailability(
                row.rental.pickupAvailability,
                row.rental.scheduledPickupAt,
              );
              const returnWindows = coerceAvailability(
                row.rental.returnAvailability,
                row.rental.scheduledReturnAt,
              );
              const state = !row.rental.pickedUpAt
                ? "Ready for pickup"
                : row.rental.status === "overdue"
                  ? `Overdue · due ${row.rental.dueAt?.toLocaleDateString()}`
                  : `Out · due ${row.rental.dueAt?.toLocaleDateString()}`;
              return (
                <article key={row.rental.id} className="manager-card panel">
                  <div className="manager-card-top">
                    <h3>{row.gearName}</h3>
                    <div className="muted" style={{ fontSize: "0.9rem" }}>
                      {row.renterName} ({row.renterNetid}){" "}
                      {row.renterIsMember ? (
                        <span className="badge badge-ok">Club member</span>
                      ) : (
                        <span className="badge">Non-member</span>
                      )}
                    </div>
                    <div style={{ fontSize: "0.95rem", marginTop: "0.35rem" }}>{state}</div>
                  </div>
                  <div className="manager-card-body">
                    {!row.rental.pickedUpAt ? (
                      <AvailabilityReadout label="Pickup" ranges={pickupWindows} />
                    ) : null}
                    <AvailabilityReadout label="Return" ranges={returnWindows} />
                  </div>
                  <div className="row">
                    {!row.rental.pickedUpAt ? (
                      <ActionButton
                        label="Confirm pickup"
                        endpoint="/api/manager/actions"
                        body={{ action: "pickup", rentalId: row.rental.id }}
                      />
                    ) : (
                      <ActionButton
                        label="Confirm return"
                        endpoint="/api/manager/actions"
                        body={{ action: "return", rentalId: row.rental.id }}
                      />
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="extensions" style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Extension approvals
        </h2>
        {pendingExtensions.length === 0 ? (
          <p className="muted">No pending extension requests.</p>
        ) : (
          <div className="manager-list">
            {pendingExtensions.map((row) => (
              <article key={row.ext.id} className="manager-card panel">
                <div className="manager-card-top">
                  <h3>{row.gearName}</h3>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {row.renterName}
                  </div>
                  <div style={{ marginTop: "0.35rem" }}>
                    Current due: {row.dueAt?.toLocaleDateString() ?? "—"}
                  </div>
                </div>
                <div className="row">
                  <ActionButton
                    label="Approve +7"
                    endpoint="/api/manager/actions"
                    body={{
                      action: "decide-extension",
                      extensionId: row.ext.id,
                      approve: true,
                    }}
                  />
                  <ActionButton
                    label="Deny"
                    variant="danger"
                    endpoint="/api/manager/actions"
                    body={{
                      action: "decide-extension",
                      extensionId: row.ext.id,
                      approve: false,
                    }}
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="waitlists" style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Waitlists
        </h2>
        {waitlist.length === 0 ? (
          <p className="muted">No one is on a waitlist.</p>
        ) : (
          <div className="manager-list">
            {waitlist.map((row) => {
              const offerLive =
                row.entry.offerExpiresAt && row.entry.offerExpiresAt > now;
              return (
                <article key={row.entry.id} className="manager-card panel">
                  <div className="manager-card-top">
                    <h3>
                      {row.gearName}{" "}
                      <span className="muted" style={{ fontSize: "1rem" }}>
                        #{row.entry.position}
                      </span>
                    </h3>
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      {row.gearStatus.replace("_", " ")}
                    </div>
                    <div style={{ marginTop: "0.35rem" }}>
                      {row.renterName}
                      <div className="muted" style={{ fontSize: "0.85rem" }}>
                        {row.renterNetid} · {row.renterEmail}
                      </div>
                    </div>
                  </div>
                  <div className="manager-card-body">
                    <div className="muted" style={{ fontSize: "0.85rem" }}>
                      Joined {row.entry.createdAt.toLocaleString()}
                    </div>
                    {offerLive ? (
                      <span className="badge badge-warn">
                        Confirm by {row.entry.offerExpiresAt!.toLocaleString()}
                      </span>
                    ) : row.gearStatus === "available" ? (
                      <span className="muted">Waiting for offer</span>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="members" style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Accounts
        </h2>
        <p className="muted" style={{ marginTop: "0.35rem" }}>
          Everyone who has signed up ({members.length}). Club member = paid dues.
        </p>
        {members.length === 0 ? (
          <p className="muted">No accounts yet.</p>
        ) : (
          <div className="manager-list">
            {members.map((m) => (
              <article key={m.id} className="manager-card panel">
                <div className="manager-card-top">
                  <h3>{m.name}</h3>
                  <div className="muted" style={{ fontSize: "0.9rem" }}>
                    {m.netid} · {m.email}
                  </div>
                </div>
                <div className="manager-card-body">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem", alignItems: "center" }}>
                    {m.isManager ? <span className="badge">Manager</span> : null}
                    {m.isMember ? (
                      <span className="badge badge-ok">Club member</span>
                    ) : (
                      <span className="badge">Non-member</span>
                    )}
                    {m.emailVerified ? (
                      <span className="muted" style={{ fontSize: "0.85rem" }}>
                        Email verified
                      </span>
                    ) : (
                      <span className="badge badge-warn">Unverified</span>
                    )}
                  </div>
                  <div className="muted" style={{ fontSize: "0.85rem" }}>
                    Joined {formatDate(m.createdAt)}
                  </div>
                </div>
                <MemberControls
                  userId={m.id}
                  name={m.name}
                  isMember={m.isMember}
                  isManager={m.isManager}
                  isSelf={m.id === session.user.id}
                />
              </article>
            ))}
          </div>
        )}
      </section>

      <section id="inventory" style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Inventory
        </h2>
        <AddEquipmentForm />
        <InventorySpreadsheet
          rows={inventory.map((item) => ({
            id: item.id,
            name: item.name,
            category: item.category,
            subcategory: item.subcategory,
            assetTag: item.assetTag,
            notes: item.notes,
            status: item.status,
          }))}
        />
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Discord alerts
        </h2>
        <DiscordNotifyControls />
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 className="brand" style={{ fontSize: "1.7rem" }}>
          Promote manager
        </h2>
        <PromoteManagerForm />
      </section>

      <p className="muted" style={{ marginTop: "2rem" }}>
        <Link href="/gear">Back to gear</Link>
      </p>
    </main>
  );
}
