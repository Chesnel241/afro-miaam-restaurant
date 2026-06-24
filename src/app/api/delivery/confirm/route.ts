import { NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { getSql, withTransaction } from "@/lib/db";
import { clientIp } from "@/lib/utils";

// =============================================================================
// POST /api/delivery/confirm — customer confirms receipt via admin-issued token
// =============================================================================
// The customer scans the admin's hand-off QR (which carries a single-use token)
// and lands on /valider-commande/[id]?t=<token>. This route validates,
// server-side:
//   1. the caller owns the order (uid; verified-email fallback),
//   2. the order is in a delivery-eligible state,
//   3. the submitted token matches the stored hash, is unexpired, unused.
// On success it atomically sets status="Livré", consumes the token, and applies
// the loyalty/referral side-effects — none of which the client can forge.
// =============================================================================

const DELIVERABLE = ["Acompte Reçu", "En attente", "En cours", "En Livraison"];

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

function hashesEqual(a: string, b: string): boolean {
  // Both are 64-char sha256 hex strings; guard length to keep timingSafeEqual happy.
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  // Coarse pre-auth IP guard protecting the JWT verify path from floods.
  if (!(await checkRateLimit(`delivery-confirm:ip:${clientIp(request)}`, 15, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const uid = claims.sub;
  const email = (claims.email || "").trim().toLowerCase();
  const emailVerified = claims.email_verified === true;

  // Per-uid rate limit keyed on the verified JWT subject.
  if (!(await checkRateLimit(`delivery-confirm:uid:${uid}`, 15, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let body: { orderId?: string; token?: string; recaptchaToken?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(body.recaptchaToken ?? null, {
      remoteIp: clientIp(request),
    });
    if (!ok) return bad("Vérification reCAPTCHA échouée.", 401);
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!orderId || orderId.length > 200) return bad("orderId invalide.");
  if (!token || token.length > 200) return bad("Jeton de livraison manquant ou invalide.");

  const submittedHash = createHash("sha256").update(token).digest("hex");

  try {
    await withTransaction(async (tx) => {
      // SELECT ... FOR UPDATE: lock the row for the duration of the
      // transaction so concurrent confirms cannot double-deliver / double-pay.
      const orderRows = await tx<{
        id: string;
        user_id: string | null;
        user_email: string | null;
        status: string;
        delivery_token_hash: string | null;
        delivery_token_exp: string | number | null;
        referrer_id: string | null;
        referral_reward_paid: boolean;
      }[]>`
        select id, user_id, user_email, status,
               delivery_token_hash, delivery_token_exp,
               referrer_id, referral_reward_paid
        from orders
        where id = ${orderId}
        for update
      `;

      if (orderRows.length === 0) throw new Error("ORDER_NOT_FOUND");
      const order = orderRows[0];

      // Ownership: uid match, or verified-email match as a fallback.
      const ownByUid = order.user_id != null && order.user_id === uid;
      const ownByEmail =
        emailVerified &&
        typeof order.user_email === "string" &&
        order.user_email.trim().toLowerCase() === email;
      if (!ownByUid && !ownByEmail) throw new Error("FORBIDDEN");

      if (order.status === "Livré") throw new Error("ALREADY_DELIVERED");
      if (!DELIVERABLE.includes(order.status)) throw new Error("NOT_DELIVERABLE");

      const storedHash = typeof order.delivery_token_hash === "string" ? order.delivery_token_hash : "";
      const expRaw = order.delivery_token_exp;
      const exp = typeof expRaw === "number" ? expRaw : typeof expRaw === "string" ? Number(expRaw) : 0;
      if (!storedHash) throw new Error("NO_TOKEN");
      if (!Number.isFinite(exp) || Date.now() > exp) throw new Error("TOKEN_EXPIRED");
      if (!hashesEqual(submittedHash, storedHash)) throw new Error("TOKEN_MISMATCH");

      // Transition + single-use consumption (NULLing the hash makes the token
      // unusable for any future request, even the same one within the TTL).
      await tx`
        update orders
        set status = 'Livré',
            delivered_at = now(),
            delivery_token_hash = null,
            delivery_token_exp = null
        where id = ${orderId}
      `;

      // Loyalty + referral side-effects (server-authoritative, applied once on
      // the non-Livré -> Livré transition, mirroring the admin dashboard path).
      const ownerId = order.user_id ?? "";
      if (ownerId) {
        await tx`
          update users
          set orders_count = orders_count + 1
          where id = ${ownerId}
        `;
      }

      // Gate the +5€ referrer reward on idempotency in addition to the
      // self-referral block. referral_reward_paid flips to true in the same
      // transaction as the credit, so concurrent calls (or retries) cannot
      // double-pay.
      const referrerId = order.referrer_id ?? "";
      const alreadyPaid = order.referral_reward_paid === true;
      if (referrerId && referrerId !== ownerId && !alreadyPaid) {
        await tx`
          update users
          set referral_credits = referral_credits + 5
          where id = ${referrerId}
        `;
        await tx`
          update orders
          set referral_reward_paid = true
          where id = ${orderId}
        `;
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const code = e instanceof Error ? e.message : "";

    // Hygiene: when the stored token is expired, wipe it from the row so the
    // dead hash doesn't sit there forever. The TX has already rolled back, so
    // we re-issue the update outside of any transaction; the guarded WHERE
    // makes it idempotent and safe against the race where another request
    // refreshed the token in between (only NULL it if it is still expired).
    if (code === "TOKEN_EXPIRED") {
      try {
        const sql = getSql();
        await sql`
          update orders
          set delivery_token_hash = null,
              delivery_token_exp = null
          where id = ${orderId}
            and delivery_token_exp is not null
            and delivery_token_exp <= ${Date.now()}
        `;
      } catch (cleanupErr) {
        console.warn(
          "TOKEN_CLEANUP_FAILED",
          (cleanupErr as { code?: string }).code ?? "unknown",
        );
      }
    }

    const map: Record<string, [string, number]> = {
      ORDER_NOT_FOUND: ["Commande introuvable.", 404],
      FORBIDDEN: ["Vous n'êtes pas autorisé à confirmer cette commande.", 403],
      ALREADY_DELIVERED: ["Cette commande a déjà été confirmée comme livrée.", 409],
      NOT_DELIVERABLE: ["Cette commande n'est pas en état d'être confirmée.", 409],
      NO_TOKEN: ["Aucun jeton de livraison actif. Demandez à l'équipe de régénérer le QR.", 409],
      TOKEN_EXPIRED: ["Le QR de livraison a expiré. Demandez-en un nouveau.", 410],
      TOKEN_MISMATCH: ["Jeton de livraison invalide.", 403],
    };
    if (code && map[code]) {
      const [msg, status] = map[code];
      return bad(msg, status);
    }
    console.error("DELIVERY_CONFIRM_FAILED", (e as { code?: string })?.code ?? "unknown");
    return bad("Erreur lors de la confirmation de la livraison.", 500);
  }
}
