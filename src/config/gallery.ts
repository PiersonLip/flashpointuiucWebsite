export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  photographer?: string;
  caption?: string;
  event?: string;
};

/**
 * @deprecated Gallery photos are managed in the database via /admin.
 * Kept only for the GalleryPhoto type used by older references.
 */
export const galleryPhotos: GalleryPhoto[] = [];

export const galleryConfig = {
  title: "Community Gallery",
  description:
    "Shots from workshops, excursions, and socials — work from Flashpoint members across campus and beyond.",
  emptyMessage:
    "We're building out the gallery. Share your photos in Discord or tag us on Instagram to be featured.",
} as const;
