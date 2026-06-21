import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";
import { invalidateMenuCache } from "@/lib/menu-cache";

/**
 * POST /api/admin/menu — admin-only create menu item.
 * Body: { id?, name, description?, price, image?, category, tags?, available?,
 *         flavors?, preferences?, allergensList? }
 */

export const dynamic = "force-dynamic";

const MAX_BODY = 32 * 1024;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 50);
}

function clean(v: unknown, max: number): string {
  if (typeof v !== "string") return "";
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

export async function POST(request: Request) {
  try {
    const claims = await requireAdmin(request);
    if (!(await checkRateLimit(`admin:menu:create:${claims.sub}`, 30, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }
    if (!(await checkRateLimit(`admin:menu:create:ip:${clientIp(request)}`, 30, 60_000))) {
      return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
    }

    const lenHeader = request.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "Requête trop volumineuse." }, { status: 413 });
    }
    const body = JSON.parse(raw);

    const name = clean(body.name, 120);
    const description = clean(body.description ?? "", 1000);
    const image = clean(body.image ?? "", 500);
    const category = clean(body.category, 60);
    const price = Number(body.price);

    if (!name) return NextResponse.json({ error: "Nom requis." }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Catégorie requise." }, { status: 400 });
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Prix invalide." }, { status: 400 });
    }

    const rawId = clean(body.id ?? "", 80);
    const generated = rawId || `${slugify(name)}-${Math.random().toString(36).slice(2, 8)}`;
    const id = generated || `item-${Math.random().toString(36).slice(2, 10)}`;

    const available = body.available !== false;
    const tags = Array.isArray(body.tags) ? body.tags : null;
    const flavors = Array.isArray(body.flavors) ? body.flavors : null;
    const preferences = Array.isArray(body.preferences) ? body.preferences : null;
    const allergensList = Array.isArray(body.allergensList) ? body.allergensList : null;

    const sql = getSql();
    const rows = await sql<Record<string, unknown>[]>`
      INSERT INTO menu_items
        (id, name, description, price, image, category, tags, available,
         flavors, preferences, allergens_list)
      VALUES
        (${id}, ${name}, ${description}, ${price}, ${image || null}, ${category},
         ${sql.json(tags ?? [])}, ${available},
         ${sql.json(flavors ?? [])}, ${sql.json(preferences ?? [])},
         ${sql.json(allergensList ?? [])})
      ON CONFLICT (id) DO NOTHING
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Identifiant déjà utilisé." }, { status: 409 });
    }

    // Drop the reservation route's process-local menu cache so the next
    // customer order sees the new item / price immediately instead of up
    // to 60s stale.
    invalidateMenuCache();
    return NextResponse.json({ ok: true, item: mapItem(rows[0]) });
  } catch (e) {
    return authErrorResponse(e);
  }
}
