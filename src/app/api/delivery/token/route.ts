import { NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { requireAdmin, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { getSql } from "@/lib/db";
import { clientIp } from "@/lib/utils";

// =============================================================================
// POST /api/delivery/token  — ADMIN ONLY
// =============================================================================
// Issues a single-use, short-lived delivery token bound to an order. The admin
// dashboard calls this when showing the hand-off QR; the QR encodes the token.
// The customer later submits it to POST /api/delivery/confirm. Only the SHA-256
// hash of the token is stored on the order, so a DB read never reveals a usable
// token. The order must already be in a deliverable status — token issuance is
// not allowed for "Attente Acompte" (no deposit) or "Livré" (already done).
// =============================================================================

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Statuses for which a delivery QR can legitimately be issued. Mirrors the
// DELIVERABLE list in /api/delivery/confirm: an order with no deposit yet, or
// one already marked delivered, must not be assigned a fresh delivery token.
const DELIVERABLE_STATUSES = ["Acompte Reçu", "En attente", "En cours"] as const;

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // Coarse pre-auth IP guard. Admin endpoints still benefit from a per-IP
  // ceiling to keep token-grinding off the JWT verification path.
  if (!(await checkRateLimit(`delivery-token:ip:${clientIp(request)}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  // Admin gate — throws AuthError(401) if no/invalid token, (403) if not admin.
  let claims;
  try {
    claims = await requireAdmin(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  // Per-uid rate limit keyed on the unspoofable, verified JWT subject.
  if (!(await checkRateLimit(`delivery-token:uid:${claims.sub}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let body: { orderId?: string; recaptchaToken?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  // reCAPTCHA verification (fail-closed in production). Admin actions still
  // benefit from bot protection since the QR token is privileged material.
  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(body.recaptchaToken ?? null, {
      remoteIp: clientIp(request),
    });
    if (!ok) return bad("Vérification reCAPTCHA échouée.", 401);
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId || orderId.length > 200) {
    return bad("orderId invalide.");
  }

  const sql = getSql();

  try {
    // Single conditional UPDATE: returns the row only if the order exists AND
    // is in a deliverable status. Lets us distinguish "not found" from "wrong
    // status" with a follow-up SELECT, while still being atomic.
    const tokenRaw = randomBytes(24).toString("hex");
    const tokenHash = createHash("sha256").update(tokenRaw).digest("hex");
    const expiresAt = Date.now() + TOKEN_TTL_MS;

    const updated = await sql<{ id: string }[]>`
      update orders
      set delivery_token_hash = ${tokenHash},
          delivery_token_exp  = ${expiresAt}
      where id = ${orderId}
        and status in ${sql(DELIVERABLE_STATUSES as unknown as string[])}
      returning id
    `;

    if (updated.length === 0) {
      // Disambiguate not-found from wrong-status for a clearer error.
      const exists = await sql<{ status: string }[]>`
        select status from orders where id = ${orderId} limit 1
      `;
      if (exists.length === 0) {
        return bad("Commande introuvable.", 404);
      }
      return bad("Cette commande n'est pas en état d'être livrée.", 409);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      token: tokenRaw,
      expiresInMs: TOKEN_TTL_MS,
    });
  } catch (e) {
    console.error("DELIVERY_TOKEN_FAILED", (e as { code?: string }).code ?? "unknown");
    return bad("Erreur lors de la génération du token.", 500);
  }
}
