import { NextResponse } from "next/server";
import { asc, eq, max } from "drizzle-orm";
import { db } from "@/db";
import { galleryPhotos } from "@/db/schema";
import { requireApiManager } from "@/lib/auth-server";
import { deleteUploadIfManaged, saveUpload } from "@/lib/uploads";

export async function GET() {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const rows = await db
    .select()
    .from(galleryPhotos)
    .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.createdAt));
  return NextResponse.json({ photos: rows });
}

export async function POST(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const form = await req.formData();
  const file = form.get("image");
  const alt = String(form.get("alt") ?? "").trim();
  const photographer = String(form.get("photographer") ?? "").trim() || null;
  const caption = String(form.get("caption") ?? "").trim() || null;
  const event = String(form.get("event") ?? "").trim() || null;

  if (!(file instanceof File) || file.size <= 0) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }

  let publicUrl: string;
  try {
    const saved = await saveUpload("gallery", file);
    publicUrl = saved.publicUrl;
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 400 },
    );
  }

  const [{ value: maxOrder } = { value: -1 }] = await db
    .select({ value: max(galleryPhotos.sortOrder) })
    .from(galleryPhotos);

  const id = crypto.randomUUID();
  await db.insert(galleryPhotos).values({
    id,
    src: publicUrl,
    alt: alt || "Community gallery photo",
    photographer,
    caption,
    event,
    sortOrder: (maxOrder ?? -1) + 1,
  });

  const [photo] = await db.select().from(galleryPhotos).where(eq(galleryPhotos.id, id)).limit(1);
  return NextResponse.json({ photo });
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
            .update(galleryPhotos)
            .set({ sortOrder: index, updatedAt: new Date() })
            .where(eq(galleryPhotos.id, id)),
        ),
      );
      return NextResponse.json({ ok: true });
    }

    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const [existing] = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, id))
      .limit(1);
    if (!existing) {
      return NextResponse.json({ error: "Photo not found" }, { status: 404 });
    }

    const alt =
      body.alt !== undefined ? String(body.alt).trim() : existing.alt;
    const photographer =
      body.photographer !== undefined
        ? String(body.photographer).trim() || null
        : existing.photographer;
    const caption =
      body.caption !== undefined
        ? String(body.caption).trim() || null
        : existing.caption;
    const event =
      body.event !== undefined
        ? String(body.event).trim() || null
        : existing.event;

    await db
      .update(galleryPhotos)
      .set({ alt, photographer, caption, event, updatedAt: new Date() })
      .where(eq(galleryPhotos.id, id));

    const [photo] = await db
      .select()
      .from(galleryPhotos)
      .where(eq(galleryPhotos.id, id))
      .limit(1);
    return NextResponse.json({ photo });
  }

  const form = await req.formData();
  const id = String(form.get("id") ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  const file = form.get("image");
  let src = existing.src;
  if (file instanceof File && file.size > 0) {
    try {
      const saved = await saveUpload("gallery", file);
      await deleteUploadIfManaged(existing.src);
      src = saved.publicUrl;
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Upload failed" },
        { status: 400 },
      );
    }
  }

  const alt =
    form.get("alt") !== null
      ? String(form.get("alt")).trim()
      : existing.alt;
  const photographer =
    form.get("photographer") !== null
      ? String(form.get("photographer")).trim() || null
      : existing.photographer;
  const caption =
    form.get("caption") !== null
      ? String(form.get("caption")).trim() || null
      : existing.caption;
  const event =
    form.get("event") !== null
      ? String(form.get("event")).trim() || null
      : existing.event;

  await db
    .update(galleryPhotos)
    .set({
      src,
      alt: alt || "Community gallery photo",
      photographer,
      caption,
      event,
      updatedAt: new Date(),
    })
    .where(eq(galleryPhotos.id, id));

  const [photo] = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .limit(1);
  return NextResponse.json({ photo });
}

export async function DELETE(req: Request) {
  const authz = await requireApiManager();
  if ("error" in authz) return authz.error;

  const body = await req.json();
  const id = String(body.id ?? "").trim();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const [existing] = await db
    .select()
    .from(galleryPhotos)
    .where(eq(galleryPhotos.id, id))
    .limit(1);
  if (!existing) {
    return NextResponse.json({ error: "Photo not found" }, { status: 404 });
  }

  await db.delete(galleryPhotos).where(eq(galleryPhotos.id, id));
  await deleteUploadIfManaged(existing.src);
  return NextResponse.json({ ok: true });
}
