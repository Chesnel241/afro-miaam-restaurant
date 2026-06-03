import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

/**
 * PATCH /api/admin/menu/[id] — admin update menu item.
 * DELETE /api/admin/menu/[id] — soft-delete.
 */

export const dynamic = "force-dynamic";

const MAX_BODY = 32 * 1024;

function clean(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim().slice(0, max);
}

function mapItem(r: Record<string, unknown>) {
  return {
    id: r.id,
    name: r.name,
    description: r.description,
    price: Number(r.price),
    image: r.image,
    category: r.category,
    tags: r.tags ?? [],
    available: r.available,
    flavors: r.flavors ?? [],
    preferences: r.preferences ?? [],
    allergensList: r.allergens_list ?? [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const claims = await requireAdmin(request);
    if (!(await checkRateLimit(`admin:menu:patch:${claims.sub}`, 60, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }
    const { id } = await params;
    const lenHeader = request.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const b = JSON.parse(raw);

    const name = clean(b.name, 120);
    const description = clean(b.description, 1000);
    const image = clean(b.image, 500);
    const category = clean(b.category, 60);
    const price =
      typeof b.price === "number" && Number.isFinite(b.price) && b.price >= 0
        ? b.price
        : null;
    const available = typeof b.available === "boolean" ? b.available : null;
    const tags = Array.isArray(b.tags) ? b.tags : null;
    const flavors = Array.isArray(b.flavors) ? b.flavors : null;
    const preferences = Array.isArray(b.preferences) ? b.preferences : null;
    const allergensList = Array.isArray(b.allergensList) ? b.allergensList : null;

    const sql = getSql();
    const rows = await sql<Record<string, unknown>[]>`
      UPDATE menu_items SET
        name = COALESCE(${name ?? null}, name),
        description = COALESCE(${description ?? null}, description),
        price = COALESCE(${price}, price),
        image = COALESCE(${image ?? null}, image),
        category = COALESCE(${category ?? null}, category),
        available = COALESCE(${available}, available),
        tags = COALESCE(${tags ? sql.json(tags) : null}, tags),
        flavors = COALESCE(${flavors ? sql.json(flavors) : null}, flavors),
        preferences = COALESCE(${preferences ? sql.json(preferences) : null}, preferences),
        allergens_list = COALESCE(${allergensList ? sql.json(allergensList) : null}, allergens_list),
        updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true, item: mapItem(rows[0]) });
  } catch (e) {
    return authErrorResponse(e);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const claims = await requireAdmin(request);
    if (!(await checkRateLimit(`admin:menu:delete:${claims.sub}`, 30, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }
    const { id } = await params;
    const sql = getSql();
    const rows = await sql`
      UPDATE menu_items SET deleted_at = now(), updated_at = now()
      WHERE id = ${id} AND deleted_at IS NULL
      RETURNING id
    `;
    if (rows.length === 0) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return authErrorResponse(e);
  }
}
