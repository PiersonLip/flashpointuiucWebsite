import { NextResponse } from "next/server";
import { asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { boardMembers } from "@/db/schema";
import { requireApiManager } from "@/lib/auth-server";
import { deleteUploadIfManaged, saveUpload } from "@/lib/uploads";

export async function GET() {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const rows = await db
    .select()
    .from(boardMembers)
    .orderBy(asc(boardMembers.sortOrder), asc(boardMembers.name));
  return NextResponse.json({ members: rows });
}

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const form = await req.formData();
  const role = String(form.get("role") ?? "").trim();
  const name = String(form.get("name") ?? "").trim();
  const file = form.get("image");

  if (!role || !name) {
    return NextResponse.json({ error: "Role and name are required" }, { status: 400 });
  }

  let imageUrl: string | null = null;
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpload("board", file);
      imageUrl = saved.publicUrl;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Upload failed" },
        { status: 400 },
      );
    }
  }

  const [{ value: maxOrder } = { value: -1 }] = await db
    .select({ value: max(boardMembers.sortOrder) })
    .from(boardMembers);

  const id = crypto.randomUUID();
  await db.insert(boardMembers).values({
    id,
    role,
    name,
    imageUrl,
    sortOrder: (maxOrder ?? -1) + 1,
  });

  const [member] = await db.select().from(boardMembers).where(eq(boardMembers.id, id)).limit(1);
  return NextResponse.json({ member });
}

export async function PATCH(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json();
    if (Array.isArray(body.orderedIds)) {
      const ids = body.orderedIds as string[];
      await Promise.all(
        ids.map((id, index) =>
          db
            .update(boardMembers)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(eq(boardMembers.id, id)),
        ),
      );
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: "Invalid reorder payload" }, { status: 400 });
  }

  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [existing] = await db.select().from(boardMembers).where(eq(boardMembers.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  const roleRaw = form.get("role");
  const nameRaw = form.get("name");
  const clearImage = String(form.get("clearImage") ?? "") === "1";
  const file = form.get("image");

  const role =
    roleRaw !== null ? String(roleRaw).trim() : existing.role;
  const name =
    nameRaw !== null ? String(nameRaw).trim() : existing.name;

  if (!role || !name) {
    return NextResponse.json({ error: "Role and name are required" }, { status: 400 });
  }

  let imageUrl = existing.imageUrl;
  if (clearImage) {
    await deleteUploadIfManaged(existing.imageUrl);
    imageUrl = null;
  }

  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpload("board", file);
      await deleteUploadIfManaged(existing.imageUrl);
      imageUrl = saved.publicUrl;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Upload failed" },
        { status: 400 },
      );
    }
  }

  await db
    .update(boardMembers)
    .set({ role, name, imageUrl, updatedAt: new Date() })
    .where(eq(boardMembers.id, id));

  const [member] = await db.select().from(boardMembers).where(eq(boardMembers.id, id)).limit(1);
  return NextResponse.json({ member });
}

export async function DELETE(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [existing] = await db.select().from(boardMembers).where(eq(boardMembers.id, id)).limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  await db.delete(boardMembers).where(eq(boardMembers.id, id));
  await deleteUploadIfManaged(existing.imageUrl);
  return NextResponse.json({ ok: true });
}
