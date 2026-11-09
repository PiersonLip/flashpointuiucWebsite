import { asc } from "drizzle-orm";
import { db } from "@/db";
import { boardMembers, galleryPhotos } from "@/db/schema";
import { siteConfig } from "@/config/site";
import { galleryConfig } from "@/config/gallery";

export type BoardMemberPublic = {
  id: string;
  role: string;
  name: string;
  imageUrl: string | null;
};

export type GalleryPhotoPublic = {
  id: string;
  src: string;
  alt: string;
  photographer: string | null;
  caption: string | null;
  event: string | null;
};

/** Fallback roster when DB is empty / unreachable during first boot. */
const fallbackBoard: BoardMemberPublic[] = siteConfig.board.map((m, i) => ({
  id: `fallback-${i}`,
  role: m.role,
  name: m.name,
  imageUrl: null,
}));

export async function getBoardMembers(): Promise<BoardMemberPublic[]> {
  try {
    const rows = await db
      .select({
        id: boardMembers.id,
        role: boardMembers.role,
        name: boardMembers.name,
        imageUrl: boardMembers.imageUrl,
      })
      .from(boardMembers)
      .orderBy(asc(boardMembers.sortOrder), asc(boardMembers.name));
    return rows.length > 0 ? rows : fallbackBoard;
  } catch {
    return fallbackBoard;
  }
}

export async function getGalleryPhotos(): Promise<GalleryPhotoPublic[]> {
  try {
    return await db
      .select({
        id: galleryPhotos.id,
        src: galleryPhotos.src,
        alt: galleryPhotos.alt,
        photographer: galleryPhotos.photographer,
        caption: galleryPhotos.caption,
        event: galleryPhotos.event,
      })
      .from(galleryPhotos)
      .orderBy(asc(galleryPhotos.sortOrder), asc(galleryPhotos.createdAt));
  } catch {
    return [];
  }
}

export { galleryConfig };
