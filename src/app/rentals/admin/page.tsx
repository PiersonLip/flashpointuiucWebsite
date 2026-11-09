import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { boardMembers, galleryPhotos } from "@/db/schema";
import { requireManager } from "@/lib/auth-server";
import { AdminBoardPanel } from "@/components/admin-board-panel";
import { AdminGalleryPanel } from "@/components/admin-gallery-panel";

export default async function SiteAdminPage() {
  await requireManager({ next: "/admin" });

  const [members, photos] = await Promise.all([
    db
      .select()
      .from(boardMembers)
      .orderBy(asc(boardMembers.sortOrder), asc(boardMembers.name)),
    db
      .select()
      .from(galleryPhotos)
      .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.createdAt)),
  ]);

  return (
    <main className="page manager-page">
      <h1 className="brand" style={{ fontSize: "clamp(2rem, 8vw, 2.8rem)" }}>
        Site admin
      </h1>
      <p className="muted" style={{ marginTop: "0.35rem", maxWidth: "40rem" }}>
        Update the public homepage gallery and executive board. Changes appear on{" "}
        <a href="https://flashpointuiuc.com" target="_blank" rel="noreferrer">
          flashpointuiuc.com
        </a>{" "}
        right away.
      </p>

      <nav className="manager-jump" aria-label="Admin sections">
        <a href="#gallery">Gallery ({photos.length})</a>
        <a href="#board">Board ({members.length})</a>
      </nav>

      <div id="gallery" style={{ marginTop: "2rem" }}>
        <AdminGalleryPanel
          initialPhotos={photos.map((p) => ({
            id: p.id,
            src: p.src,
            alt: p.alt,
            photographer: p.photographer,
            caption: p.caption,
            event: p.event,
            sortOrder: p.sortOrder,
          }))}
        />
      </div>

      <div id="board" style={{ marginTop: "2.5rem" }}>
        <AdminBoardPanel
          initialMembers={members.map((m) => ({
            id: m.id,
            role: m.role,
            name: m.name,
            imageUrl: m.imageUrl,
            sortOrder: m.sortOrder,
          }))}
        />
      </div>

      <p className="muted" style={{ marginTop: "2rem" }}>
        <Link href="/manager">Back to rentals manager</Link>
      </p>
    </main>
  );
}
