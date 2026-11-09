import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import { absolutePathFromPublicUrl } from "@/lib/uploads";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path: parts } = await context.params;
  if (!parts?.length) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (parts.some((p) => p === ".." || p.includes("\0") || path.isAbsolute(p))) {
    return new NextResponse("Not found", { status: 404 });
  }

  const publicUrl = `/uploads/${parts.join("/")}`;
  const abs = absolutePathFromPublicUrl(publicUrl);
  if (!abs) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const info = await stat(abs);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    const ext = path.extname(abs).toLowerCase();
    const type = CONTENT_TYPES[ext];
    if (!type) {
      return new NextResponse("Not found", { status: 404 });
    }
    const data = await readFile(abs);
    return new NextResponse(data, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
