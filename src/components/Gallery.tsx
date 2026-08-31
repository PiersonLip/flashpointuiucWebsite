import Image from "next/image";
import { galleryConfig, galleryPhotos } from "@/config/gallery";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/Button";

function PlaceholderTile({ index }: { index: number }) {
  const spans = ["col-span-1 row-span-1", "col-span-1 row-span-2", "col-span-1 row-span-1"];
  return (
    <div
      className={`${spans[index % spans.length]} flex min-h-[180px] items-end rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-4`}
    >
      <p className="text-xs text-muted">Photo slot {index + 1}</p>
    </div>
  );
}

export function Gallery() {
  const hasPhotos = galleryPhotos.length > 0;

  return (
    <section id="gallery" className="relative py-24">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-sky">
              Gallery
            </p>
            <h2 className="font-display mb-4 text-3xl font-bold text-cream md:text-5xl">
              {galleryConfig.title}
            </h2>
            <p className="text-lg text-cream/70">{galleryConfig.description}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href={siteConfig.links.instagram} variant="secondary" external>
              View on Instagram
            </Button>
            <Button href={siteConfig.links.discord} variant="ghost" external>
              Share in Discord
            </Button>
          </div>
        </div>

        {hasPhotos ? (
          <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {galleryPhotos.map((photo, index) => (
              <figure
                key={photo.id}
                className={`group relative min-h-[180px] overflow-hidden rounded-xl border border-[var(--card-border)] bg-[var(--card)] ${
                  index % 5 === 0 ? "md:col-span-2 md:row-span-2" : ""
                }`}
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  className="object-cover transition-transform duration-500 group-hover:scale-105"
                  sizes="(max-width: 768px) 50vw, 25vw"
                />
                <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-navy-deep/90 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
                  {photo.photographer && (
                    <p className="text-sm font-medium text-cream">@{photo.photographer}</p>
                  )}
                  {photo.event && <p className="text-xs text-muted">{photo.event}</p>}
                  {photo.caption && (
                    <p className="mt-1 text-xs text-cream/70">{photo.caption}</p>
                  )}
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <div className="grid auto-rows-[180px] grid-cols-2 gap-4 md:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <PlaceholderTile key={i} index={i} />
            ))}
          </div>
        )}

        {!hasPhotos && (
          <p className="mt-8 text-center text-cream/60">{galleryConfig.emptyMessage}</p>
        )}
      </div>
    </section>
  );
}
