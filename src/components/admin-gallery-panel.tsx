"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export type AdminGalleryPhoto = {
  id: string;
  src: string;
  alt: string;
  photographer: string | null;
  caption: string | null;
  event: string | null;
  sortOrder: number;
};

export function AdminGalleryPanel({ initialPhotos }: { initialPhotos: AdminGalleryPhoto[] }) {
  const router = useRouter();
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function refreshFromServer() {
    const res = await fetch("/api/admin/gallery");
    if (!res.ok) return;
    const data = await res.json();
    setPhotos(data.photos);
  }

  async function onAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const form = e.currentTarget;
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/admin/gallery", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not upload photo");
      form.reset();
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload photo");
    } finally {
      setPending(false);
    }
  }

  async function onSaveMeta(id: string, form: HTMLFormElement) {
    setPending(true);
    setError(null);
    const fd = new FormData(form);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          alt: String(fd.get("alt") ?? ""),
          photographer: String(fd.get("photographer") ?? ""),
          caption: String(fd.get("caption") ?? ""),
          event: String(fd.get("event") ?? ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save");
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setPending(false);
    }
  }

  async function onReplaceImage(id: string, file: File) {
    setPending(true);
    setError(null);
    const fd = new FormData();
    fd.set("id", id);
    fd.set("image", file);
    try {
      const res = await fetch("/api/admin/gallery", { method: "PATCH", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not replace image");
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not replace image");
    } finally {
      setPending(false);
    }
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this gallery photo?")) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      await refreshFromServer();
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setPending(false);
    }
  }

  async function move(id: string, direction: -1 | 1) {
    const index = photos.findIndex((p) => p.id === id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= photos.length) return;
    const reordered = [...photos];
    const [item] = reordered.splice(index, 1);
    reordered.splice(next, 0, item);
    setPhotos(reordered);
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/gallery", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((p) => p.id) }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Could not reorder");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reorder");
      await refreshFromServer();
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="admin-section">
      <h2 className="brand" style={{ fontSize: "1.7rem" }}>
        Community gallery
      </h2>
      <p className="muted" style={{ marginTop: "0.35rem" }}>
        Photos shown on the homepage gallery. JPEG, PNG, WebP, or GIF up to 8MB.
      </p>

      {error ? <p className="error" style={{ marginTop: "0.75rem" }}>{error}</p> : null}

      <form
        className="panel stack"
        style={{ marginTop: "1rem", padding: "1rem", gap: "0.75rem" }}
        onSubmit={onAdd}
      >
        <strong>Upload photo</strong>
        <div>
          <label className="label" htmlFor="gallery-image">
            Image
          </label>
          <input
            className="input"
            id="gallery-image"
            name="image"
            type="file"
            accept="image/*"
            required
          />
        </div>
        <div className="admin-grid-2">
          <div>
            <label className="label" htmlFor="gallery-alt">
              Alt text
            </label>
            <input className="input" id="gallery-alt" name="alt" placeholder="Describe the photo" />
          </div>
          <div>
            <label className="label" htmlFor="gallery-photographer">
              Photographer
            </label>
            <input
              className="input"
              id="gallery-photographer"
              name="photographer"
              placeholder="Optional"
            />
          </div>
          <div>
            <label className="label" htmlFor="gallery-event">
              Event
            </label>
            <input className="input" id="gallery-event" name="event" placeholder="Optional" />
          </div>
          <div>
            <label className="label" htmlFor="gallery-caption">
              Caption
            </label>
            <input className="input" id="gallery-caption" name="caption" placeholder="Optional" />
          </div>
        </div>
        <button className="btn btn-primary" type="submit" disabled={pending}>
          {pending ? "Uploading…" : "Add to gallery"}
        </button>
      </form>

      <div className="manager-list" style={{ marginTop: "1.25rem" }}>
        {photos.length === 0 ? (
          <p className="muted">No gallery photos yet.</p>
        ) : (
          photos.map((photo, index) => (
            <article key={photo.id} className="manager-card panel">
              <div className="admin-member-head">
                <div className="admin-gallery-thumb">
                  <Image
                    src={photo.src}
                    alt={photo.alt || "Gallery photo"}
                    width={120}
                    height={120}
                    unoptimized
                    className="admin-gallery-img"
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <form
                    className="stack"
                    style={{ gap: "0.55rem" }}
                    onSubmit={(e) => {
                      e.preventDefault();
                      onSaveMeta(photo.id, e.currentTarget);
                    }}
                  >
                    <div className="admin-grid-2">
                      <div>
                        <label className="label">Alt text</label>
                        <input className="input" name="alt" defaultValue={photo.alt} />
                      </div>
                      <div>
                        <label className="label">Photographer</label>
                        <input
                          className="input"
                          name="photographer"
                          defaultValue={photo.photographer ?? ""}
                        />
                      </div>
                      <div>
                        <label className="label">Event</label>
                        <input className="input" name="event" defaultValue={photo.event ?? ""} />
                      </div>
                      <div>
                        <label className="label">Caption</label>
                        <input
                          className="input"
                          name="caption"
                          defaultValue={photo.caption ?? ""}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="label">Replace image</label>
                      <input
                        className="input"
                        type="file"
                        accept="image/*"
                        disabled={pending}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) onReplaceImage(photo.id, file);
                          e.currentTarget.value = "";
                        }}
                      />
                    </div>
                    <div className="row">
                      <button className="btn btn-primary" type="submit" disabled={pending}>
                        Save details
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={pending || index === 0}
                        onClick={() => move(photo.id, -1)}
                      >
                        Up
                      </button>
                      <button
                        className="btn"
                        type="button"
                        disabled={pending || index === photos.length - 1}
                        onClick={() => move(photo.id, 1)}
                      >
                        Down
                      </button>
                      <button
                        className="btn btn-danger"
                        type="button"
                        disabled={pending}
                        onClick={() => onDelete(photo.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
