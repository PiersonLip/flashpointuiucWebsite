import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/** Absolute dir for uploaded site media (persists across deploys via volume/bind). */
export function uploadsRoot() {
  const fromEnv = process.env.UPLOADS_DIR?.trim();
  if (fromEnv) return fromEnv;
  return path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "uploads");
}

export function publicUrlForUpload(subdir: "gallery" | "board", filename: string) {
  return `/uploads/${subdir}/${filename}`;
}

export function absolutePathFromPublicUrl(publicUrl: string) {
  if (!publicUrl.startsWith("/uploads/")) return null;
  const relative = publicUrl.replace(/^\/uploads\//, "");
  if (!relative || relative.includes("..") || path.isAbsolute(relative)) return null;

  const root = path.normalize(uploadsRoot());
  const abs = path.normalize(path.join(root, relative));
  if (abs !== root && !abs.startsWith(root + path.sep)) {
    return null;
  }
  return abs;
}

export async function saveUpload(
  subdir: "gallery" | "board",
  file: File,
): Promise<{ publicUrl: string; filename: string }> {
  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    throw new Error("Only JPEG, PNG, WebP, and GIF images are allowed");
  }
  if (file.size <= 0 || file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be under 8MB");
  }

  const dir = path.join(uploadsRoot(), subdir);
  await mkdir(dir, { recursive: true });

  const filename = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const abs = path.join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(abs, buffer);

  return { publicUrl: publicUrlForUpload(subdir, filename), filename };
}

export async function deleteUploadIfManaged(publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  const abs = absolutePathFromPublicUrl(publicUrl);
  if (!abs) return;
  try {
    await unlink(abs);
  } catch {
    // Missing file is fine (already removed or legacy path)
  }
}
