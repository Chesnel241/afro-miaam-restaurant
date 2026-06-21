/**
 * Server-side menu cache.
 *
 * Hoisted out of /api/reservation/route.ts so admin write paths
 * (/api/admin/menu, /api/admin/menu/[id], /api/admin/menu/upload) can
 * invalidate it after a successful mutation. Without an invalidator a price
 * change could be stale for up to PRICE_CACHE_TTL_MS (60s) — long enough for
 * a customer to lock in the old price.
 *
 * Process-scoped: a single Node process owns this Map. Restaurants with a
 * multi-instance app would need a Redis-backed cache; for the single Hetzner
 * container we ship today, this is the right shape.
 */

import { menuItems } from "@/data/menu";
import { getSql } from "@/lib/db";

export type FlavorSupplement = { name: string; supplement: number };
export type MenuEntry = {
  price: number;
  available: boolean;
  flavors: FlavorSupplement[];
};

export const PRICE_CACHE_TTL_MS = 60_000;

// Static fallback used only when the Postgres read fails. The reservation
// route still validates `available` and the slot constraints — the fallback
// just keeps the route from outright 503'ing on a transient DB hiccup.
const STATIC_MENU_BY_ID: Record<string, MenuEntry> = Object.fromEntries(
  menuItems.map((i) => [
    i.id,
    {
      price: i.price,
      available: true,
      flavors: Array.isArray((i as { flavors?: FlavorSupplement[] }).flavors)
        ? ((i as { flavors?: FlavorSupplement[] }).flavors as FlavorSupplement[])
        : [],
    },
  ]),
);

let menuCache: { byId: Record<string, MenuEntry>; expires: number } | null = null;
let menuCachePromise: Promise<Record<string, MenuEntry>> | null = null;

export async function getMenuById(): Promise<Record<string, MenuEntry>> {
  const now = Date.now();
  if (menuCache && now < menuCache.expires) return menuCache.byId;
  if (menuCachePromise) return menuCachePromise;

  menuCachePromise = (async () => {
    try {
      const sql = getSql();
      const rows = await sql<
        { id: string; price: string | number; available: boolean; flavors: unknown }[]
      >`
        SELECT id, price, available, flavors
        FROM menu_items
        WHERE deleted_at IS NULL
      `;
      const byId: Record<string, MenuEntry> = {};
      for (const row of rows) {
        const price = typeof row.price === "number" ? row.price : Number(row.price);
        if (!Number.isFinite(price) || price < 0) continue;
        const flavors = Array.isArray(row.flavors)
          ? (row.flavors as unknown[])
              .map((f): FlavorSupplement | null => {
                if (!f || typeof f !== "object") return null;
                const obj = f as { name?: unknown; supplement?: unknown };
                const name = typeof obj.name === "string" ? obj.name : null;
                const supplement =
                  typeof obj.supplement === "number"
                    ? obj.supplement
                    : Number(obj.supplement);
                if (!name || !Number.isFinite(supplement) || supplement < 0) {
                  return null;
                }
                return { name, supplement };
              })
              .filter((f): f is FlavorSupplement => f !== null)
          : [];
        byId[row.id] = { price, available: row.available !== false, flavors };
      }
      menuCache = { byId, expires: Date.now() + PRICE_CACHE_TTL_MS };
      return byId;
    } catch (e) {
      console.warn("MENU_PG_READ_FAILED", (e as { code?: string }).code ?? "unknown");
      return STATIC_MENU_BY_ID;
    } finally {
      menuCachePromise = null;
    }
  })();

  return menuCachePromise;
}

/**
 * Drop the cached menu so the next getMenuById() refetches from Postgres.
 * Call from any admin write that mutates menu_items (create, patch, delete,
 * upload-that-affects-image — only price/available actually matter for the
 * reservation route, but invalidating across the board keeps the rule
 * obvious for the next dev).
 */
export function invalidateMenuCache(): void {
  menuCache = null;
  // We don't cancel an in-flight refresh promise — any caller already awaiting
  // it will get a fresh-enough result, and the next call after that will
  // start a new fetch because menuCache is null.
}
