import type { CartLine } from "@/lib/types";

// Extracted from CartContext.tsx so unit tests can import this pure logic
// without dragging in JSX (vitest's esbuild transform with tsconfig
// "jsx: preserve" trips on the Provider's <CartContext.Provider> return).

export function sanitizeStoredLines(raw: unknown): CartLine[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const safe: CartLine[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const id = typeof e.id === "string" ? e.id.slice(0, 80) : "";
    const itemId = typeof e.itemId === "string" ? e.itemId.slice(0, 80) : id;
    const name = typeof e.name === "string" ? e.name.slice(0, 120) : "";
    const price = typeof e.price === "number" && Number.isFinite(e.price) && e.price >= 0 ? e.price : 0;
    const image = typeof e.image === "string" ? e.image.slice(0, 500) : "";
    const quantity = typeof e.quantity === "number" && Number.isInteger(e.quantity) ? Math.min(50, Math.max(1, e.quantity)) : 1;
    const flavor = typeof e.flavor === "string" ? e.flavor.slice(0, 200) : undefined;
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    safe.push({ id, itemId, name, price, image, quantity, flavor });
  }
  return safe.slice(0, 50);
}
