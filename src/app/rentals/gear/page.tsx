import { and, asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { equipment, rentalRequests, rentals, waitlistEntries } from "@/db/schema";
import { requireUser } from "@/lib/auth-server";
import { CATEGORIES } from "@/lib/constants";
import { ActionButton } from "@/components/action-button";
import { RequestGearButton } from "@/components/request-gear-button";
import { EquipmentSpecs } from "@/components/equipment-specs";
import {
  getActiveWaitlistOffer,
  notifyNextWaitlist,
  userHasOverdue,
} from "@/lib/rentals";

function statusBadge(status: string) {
  if (status === "available") return "badge badge-ok";
  if (status === "overdue" || status === "repair" || status === "retired") return "badge badge-danger";
  if (status === "checked_out" || status === "reserved" || status === "requested") return "badge badge-warn";
  return "badge";
}

export default async function GearPage() {
  const session = await requireUser({ next: "/gear" });
  const overdue = await userHasOverdue(session.user.id);
  const items = await db.select().from(equipment).orderBy(asc(equipment.category), asc(equipment.name));

  const myPending = await db
    .select({ equipmentId: rentalRequests.equipmentId })
    .from(rentalRequests)
    .where(
      and(eq(rentalRequests.userId, session.user.id), eq(rentalRequests.status, "pending")),
    );

  const myActive = await db
    .select({ equipmentId: rentals.equipmentId })
    .from(rentals)
    .where(and(eq(rentals.userId, session.user.id), ne(rentals.status, "returned")));

  const myWaitlist = await db
    .select()
    .from(waitlistEntries)
    .where(eq(waitlistEntries.userId, session.user.id));

  const allWaitlist = await db
    .select({ equipmentId: waitlistEntries.equipmentId })
    .from(waitlistEntries);

  const pendingIds = new Set(myPending.map((r) => r.equipmentId));
  const activeIds = new Set(myActive.map((r) => r.equipmentId));
  const waitlistByEquip = new Map(myWaitlist.map((w) => [w.equipmentId, w]));
  const hasWaitlist = new Set(allWaitlist.map((w) => w.equipmentId));

  const offers = new Map<string, Awaited<ReturnType<typeof getActiveWaitlistOffer>>>();
  for (const item of items) {
    if (item.status === "available") {
      let offer = await getActiveWaitlistOffer(item.id);
      // Self-heal: available + waitlist but no live offer → open 24h claim
      if (!offer && hasWaitlist.has(item.id)) {
        await notifyNextWaitlist(item.id);
        offer = await getActiveWaitlistOffer(item.id);
      }
      offers.set(item.id, offer);
    }
  }

  const groups = (Object.keys(CATEGORIES) as Array<keyof typeof CATEGORIES>).map((key) => ({
    key,
    label: CATEGORIES[key].label,
    items: items.filter((i) => i.category === key && i.status !== "retired"),
  }));

  return (
    <main className="page">
      <h1 className="brand rise" style={{ fontSize: "2.8rem", marginBottom: "0.35rem" }}>
        Browse camera inventory
      </h1>
      <p className="muted rise rise-delay-1">
        Request available camera bodies, lenses, and other gear from the club inventory.
      </p>
      {overdue ? (
        <p className="error rise rise-delay-2" style={{ marginTop: "1rem" }}>
          You have overdue gear — new requests are blocked until it is returned.
        </p>
      ) : null}

      <div className="stack" style={{ marginTop: "2rem", gap: "2.5rem" }}>
        {groups.map((group) => (
          <section key={group.key} className="rise rise-delay-2">
            <h2 className="brand" style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
              {group.label}
            </h2>
            {group.items.length === 0 ? (
              <p className="muted">No items in this category yet.</p>
            ) : (
              <div className="grid-equip">
                {group.items.map((item) => {
                  const minePending = pendingIds.has(item.id);
                  const mineActive = activeIds.has(item.id);
                  const myWl = waitlistByEquip.get(item.id);
                  const onWaitlist = Boolean(myWl);
                  const offer = offers.get(item.id) ?? null;
                  const myOffer =
                    offer &&
                    offer.userId === session.user.id &&
                    offer.offerExpiresAt &&
                    offer.offerExpiresAt > new Date();
                  const heldForOther =
                    item.status === "available" &&
                    offer &&
                    offer.userId !== session.user.id;

                  const canWaitlist =
                    !overdue &&
                    !minePending &&
                    !mineActive &&
                    !onWaitlist &&
                    item.status !== "available" &&
                    item.status !== "repair" &&
                    item.status !== "retired";

                  const waitlisted = hasWaitlist.has(item.id);
                  const canNormalRequest =
                    item.status === "available" &&
                    !overdue &&
                    !minePending &&
                    !mineActive &&
                    !onWaitlist &&
                    !waitlisted &&
                    !heldForOther &&
                    !myOffer &&
                    !offer;

                  return (
                    <article key={item.id} className="panel equip-item">
                      <span className={statusBadge(item.status)}>
                        {item.status.replace("_", " ")}
                      </span>
                      <h3>{item.name}</h3>
                      <p className="muted equip-meta">
                        {item.subcategory}
                        {item.assetTag ? ` · ${item.assetTag}` : ""}
                      </p>
                      <EquipmentSpecs assetTag={item.assetTag} notes={item.notes} />
                      <div className="row" style={{ marginTop: "1rem" }}>
                        {canNormalRequest ? (
                          <RequestGearButton
                            equipmentId={item.id}
                            equipmentName={item.name}
                          />
                        ) : null}
                        {myOffer ? (
                          <RequestGearButton
                            equipmentId={item.id}
                            equipmentName={item.name}
                            mode="waitlist-confirm"
                            offerExpiresAt={offer?.offerExpiresAt?.toISOString() ?? null}
                          />
                        ) : null}
                        {heldForOther ||
                        (item.status === "available" &&
                          waitlisted &&
                          !myOffer &&
                          !minePending &&
                          !mineActive) ? (
                          <span className="badge badge-warn">
                            {heldForOther
                              ? `Held for waitlist until ${offer?.offerExpiresAt?.toLocaleString() ?? "soon"}`
                              : "Reserved for waitlist"}
                          </span>
                        ) : null}
                        {minePending ? (
                          <span className="badge badge-warn">Your request is pending</span>
                        ) : null}
                        {mineActive ? (
                          <span className="badge badge-warn">Yours — see My rentals</span>
                        ) : null}
                        {onWaitlist && !minePending && !mineActive && !myOffer ? (
                          <span className="badge">
                            On waitlist
                            {myWl?.position ? ` · #${myWl.position}` : ""}
                          </span>
                        ) : null}
                        {canWaitlist ? (
                          <ActionButton
                            label="Join waitlist"
                            variant="ghost"
                            body={{ action: "waitlist", equipmentId: item.id }}
                          />
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ))}
      </div>
    </main>
  );
}
