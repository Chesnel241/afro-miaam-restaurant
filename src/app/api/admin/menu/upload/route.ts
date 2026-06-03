import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * POST /api/admin/menu/upload — admin uploads a menu image (multipart "file").
 *
 * Security model:
 * - Only authenticated admins can call this endpoint (requireAdmin).
 * - The file's TYPE is determined by inspecting its magic bytes — NOT by
 *   trusting the client-supplied Content-Type, which is forgeable.
 * - Only the JPEG / PNG / WebP / GIF raster formats are accepted.
 *   SVG is explicitly EXCLUDED because an SVG can carry inline <script>,
 *   which Caddy would serve at the site origin (stored XSS).
 * - The extension on disk is FORCED from the detected type so that an
 *   attacker can't ship a `.svg`/`.html`/`.js` file by setting the name.
 *
 * Files land in UPLOAD_DIR (default /app/uploads). Caddy serves /uploads/*
 * directly from disk in production.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

type ImageType = "jpeg" | "png" | "webp" | "gif";

const EXTENSION_FOR_TYPE: Record<ImageType, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  gif: "gif",
};

const CONTENT_TYPE_FOR_TYPE: Record<ImageType, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

/**
 * Detect the image type from the first few bytes of the buffer. Returns null
 * for anything that doesn't match a supported raster format — including SVG,
 * HTML, polyglots, and zero-byte uploads.
 */
function detectImageType(buf: Buffer): ImageType | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "png";
  }

  // GIF: "GIF87a" or "GIF89a"
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "gif";
  }

  // WebP: "RIFF....WEBP"
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "webp";
  }

  return null;
}

function safeSlug(name: string): string {
  // Strip the extension first, sanitize the rest, never let path separators in.
  const base = name.replace(/\.[^.]+$/, "");
  const slug = base.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40);
  return slug || "image";
}

export async function POST(request: Request) {
  try {
    const claims = await requireAdmin(request);
    if (!(await checkRateLimit(`admin:upload:${claims.sub}`, 10, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Fichier manquant." }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_BYTES) {
      return NextResponse.json(
        { error: "Fichier invalide ou trop volumineux (max 5 Mo)." },
        { status: 413 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const detected = detectImageType(buffer);
    if (!detected) {
      return NextResponse.json(
        { error: "Format d'image non supporté (JPEG, PNG, WebP, GIF uniquement)." },
        { status: 400 },
      );
    }

    const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
    await fs.mkdir(uploadDir, { recursive: true });

    const rand = crypto.randomBytes(8).toString("hex");
    const extension = EXTENSION_FOR_TYPE[detected];
    const filename = `${Date.now()}-${rand}-${safeSlug(file.name)}.${extension}`;
    const fullPath = path.join(uploadDir, filename);

    // Defense in depth: ensure the resolved path stays inside uploadDir.
    const resolvedUploadDir = path.resolve(uploadDir);
    const resolvedFullPath = path.resolve(fullPath);
    if (
      !resolvedFullPath.startsWith(resolvedUploadDir + path.sep) &&
      resolvedFullPath !== resolvedUploadDir
    ) {
      return NextResponse.json(
        { error: "Chemin de fichier invalide." },
        { status: 400 },
      );
    }

    await fs.writeFile(resolvedFullPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      filename,
      contentType: CONTENT_TYPE_FOR_TYPE[detected],
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
