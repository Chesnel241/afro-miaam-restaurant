import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { clientIp } from "@/lib/utils";

/**
 * GET /api/menu — public, polled by MenuContext ~every 30s.
 *
 * Returns the full set of non-soft-deleted menu items in display order.
 * Public cacheable response (30s s-maxage) so a small CDN/Caddy layer can
 * collapse the polling traffic; clients still see fresh data within ~30s.
 */

export const dynamic = "force-dynamic";

type MenuRow = {
  id: string;
  name: string;
  description: string | null;
  price: string | number;
  image: string | null;
  category: string | null;
  tags: unknown;
  available: boolean;
  flavors: unknown;
  preferences: unknown;
  allergens_list: unknown;
  created_at: Date;
  updated_at: Date;
};

function mapMenuItem(row: MenuRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: typeof row.price === "number" ? row.price : Number(row.price),
    image: row.image,
    category: row.category,
    tags: row.tags,
    available: row.available,
    flavors: row.flavors,
    preferences: row.preferences,
    allergensList: row.allergens_list,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function GET(request: Request) {
  if (!(await checkRateLimit(`menu:ip:${clientIp(request)}`, 120, 60_000))) {
    return NextResponse.json(
      { error: "Trop de requêtes. Réessayez dans une minute." },
      {
        status: 429,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }

  const sql = getSql();
  const rows = await sql<MenuRow[]>`
    SELECT id, name, description, price, image, category, tags,
           available, flavors, preferences, allergens_list,
           created_at, updated_at
    FROM menu_items
    WHERE deleted_at IS NULL
    ORDER BY category, name
  `;

  return NextResponse.json(
    { ok: true, items: rows.map(mapMenuItem) },
    {
      headers: {
        "Cache-Control": "public, max-age=30, s-maxage=30",
      },
    },
  );
}
