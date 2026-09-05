import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { equipment } from "@/db/schema";
import { requireApiManager } from "@/lib/auth-server";
import { CATEGORIES, type EquipmentCategory } from "@/lib/constants";
import { setEquipmentManagerStatus } from "@/lib/rentals";

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  const body = await req.json();
  const name = String(body.name ?? "").trim();
  const category = body.category as EquipmentCategory;
  const subcategory = String(body.subcategory ?? "").trim();
  const assetTag = body.assetTag ? String(body.assetTag).trim() : null;
  const notes = body.notes ? String(body.notes).trim() : null;

  if (!name || !(category in CATEGORIES) || !subcategory) {
    return NextResponse.json({ error: "Invalid equipment" }, { status: 400 });
  }

  const allowed = CATEGORIES[category].subcategories as readonly string[];
  if (!allowed.includes(subcategory)) {
    return NextResponse.json({ error: "Invalid subcategory for category" }, { status: 400 });
  }

  const id = crypto.randomUUID();
  await db.insert(equipment).values({
    id,
    name,
    category,
    subcategory,
    assetTag,
    notes,
    status: "available",
    createdById: authz.session.user.id,
  });

  return NextResponse.json({ id });
}

export async function PATCH(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  const body = await req.json();
  const id = String(body.id ?? "");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [item] = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Status-only updates (existing workflow)
  if (
    body.status &&
    body.name === undefined &&
    body.notes === undefined &&
    body.assetTag === undefined &&
    body.category === undefined &&
    body.subcategory === undefined
  ) {
    const status = body.status as "available" | "repair" | "retired";
    if (!["available", "repair", "retired"].includes(status)) {
      return NextResponse.json({ error: "Invalid" }, { status: 400 });
    }
    try {
      await setEquipmentManagerStatus({ equipmentId: id, status });
      return NextResponse.json({ ok: true });
    } catch (e) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "Failed" },
        { status: 400 },
      );
    }
  }

  const patch: {
    name?: string;
    category?: EquipmentCategory;
    subcategory?: string;
    assetTag?: string | null;
    notes?: string | null;
    updatedAt: Date;
  } = { updatedAt: new Date() };

  if (body.name !== undefined) {
    const name = String(body.name ?? "").trim();
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });
    patch.name = name;
  }

  if (body.category !== undefined || body.subcategory !== undefined) {
    const category = (body.category !== undefined
      ? String(body.category)
      : item.category) as EquipmentCategory;
    const subcategory =
      body.subcategory !== undefined ? String(body.subcategory).trim() : item.subcategory;
    if (!(category in CATEGORIES)) {
      return NextResponse.json({ error: "Invalid category" }, { status: 400 });
    }
    const allowed = CATEGORIES[category].subcategories as readonly string[];
    if (!allowed.includes(subcategory)) {
      return NextResponse.json({ error: "Invalid subcategory for category" }, { status: 400 });
    }
    patch.category = category;
    patch.subcategory = subcategory;
  }

  if (body.assetTag !== undefined) {
    const tag = String(body.assetTag ?? "").trim();
    patch.assetTag = tag || null;
  }

  if (body.notes !== undefined) {
    const notes = String(body.notes ?? "").trim();
    patch.notes = notes || null;
  }

  await db.update(equipment).set(patch).where(eq(equipment.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const [item] = await db.select().from(equipment).where(eq(equipment.id, id)).limit(1);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (item.status !== "retired" && item.status !== "available") {
    return NextResponse.json(
      { error: "Only available or retired items can be removed" },
      { status: 400 },
    );
  }

  await db.delete(equipment).where(eq(equipment.id, id));
  return NextResponse.json({ ok: true });
}
