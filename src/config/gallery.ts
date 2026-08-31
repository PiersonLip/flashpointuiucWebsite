export type GalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  photographer?: string;
  caption?: string;
  event?: string;
};

/**
 * Add community photos here. Drop images in public/gallery/ and reference them
 * as `/gallery/your-file.jpg`.
 *
 * Example:
 * {
 *   id: "excursion-fall-2025",
 *   src: "/gallery/excursion-fall-2025.jpg",
 *   alt: "Members shooting at Japan House during an excursion",
 *   photographer: "Alex",
 *   event: "Japan House Excursion",
 * }
 */
export const galleryPhotos: GalleryPhoto[] = [];

export const galleryConfig = {
  title: "Community Gallery",
  description:
    "Shots from workshops, excursions, and socials — work from Flashpoint members across campus and beyond.",
  emptyMessage:
    "We're building out the gallery. Share your photos in Discord or tag us on Instagram to be featured.",
} as const;
