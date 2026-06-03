import { NextResponse } from "next/server";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

/**
 * POST /api/admin/menu/upload — admin uploads an image (multipart "file").
 * Writes to UPLOAD_DIR (default /app/uploads) and returns { url: "/uploads/<filename>" }.
 * Caddy serves /uploads/* directly from disk in production.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;

function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 60) || "image";
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
    if (!file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Type de fichier non autorisé." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 5 Mo)." }, { status: 413 });
    }

    const uploadDir = process.env.UPLOAD_DIR || "/app/uploads";
    await fs.mkdir(uploadDir, { recursive: true });

    const rand = crypto.randomBytes(3).toString("hex");
    const filename = `${Date.now()}-${rand}-${sanitizeName(file.name)}`;
    const fullPath = path.join(uploadDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(fullPath, buffer);

    return NextResponse.json({
      ok: true,
      url: `/uploads/${filename}`,
      filename,
    });
  } catch (e) {
    return authErrorResponse(e);
  }
}
