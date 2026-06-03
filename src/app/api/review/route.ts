import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { withTransaction } from "@/lib/db";
import { clientIp } from "@/lib/utils";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // Coarse pre-auth IP guard (hardened clientIp) protecting the JWT verify
  // path from unauthenticated floods.
  if (!(await checkRateLimit(`review:ip:${clientIp(request)}`, 15, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const userId = claims.sub;
  const userEmail = (claims.email || "").trim().toLowerCase();

  // Per-uid rate limit keyed on the unspoofable, verified JWT subject.
  if (!(await checkRateLimit(`review:uid:${userId}`, 15, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let payload: {
    orderId?: string;
    reaction?: "bon" | "moyen" | "pas_bon";
    recaptchaToken?: string;
  };
  try {
    payload = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  if (process.env.NODE_ENV === "production") {
    const ok = await verifyRecaptcha(payload.recaptchaToken ?? null, {
      remoteIp: clientIp(request),
    });
    if (!ok) return bad("Vérification reCAPTCHA échouée.", 401);
  }

  const { orderId, reaction } = payload;
  if (
    !orderId ||
    typeof orderId !== "string" ||
    orderId.includes("/") ||
    !reaction ||
    !["bon", "moyen", "pas_bon"].includes(reaction)
  ) {
    return bad("Paramètres manquants ou invalides.");
  }

  try {
    let creditsAdded = 0;

    await withTransaction(async (tx) => {
      // SELECT ... FOR UPDATE: lock the row for the transaction so concurrent
      // submissions can't double-credit the same review.
      const orderRows = await tx<{
        id: string;
        user_id: string | null;
        user_email: string | null;
        status: string;
        has_reviewed: boolean;
      }[]>`
        select id, user_id, user_email, status, has_reviewed
        from orders
        where id = ${orderId}
        for update
      `;

      if (orderRows.length === 0) {
        throw new Error("ORDER_NOT_FOUND");
      }
      const order = orderRows[0];

      // Ownership check (uid or verified email).
      const isOwnerByUid = order.user_id != null && order.user_id === userId;
      const isOwnerByEmail =
        claims.email_verified === true &&
        typeof order.user_email === "string" &&
        order.user_email.trim().toLowerCase() === userEmail;

      if (!isOwnerByUid && !isOwnerByEmail) {
        throw new Error("FORBIDDEN");
      }

      if (order.status !== "Livré") {
        throw new Error("ORDER_NOT_DELIVERED");
      }

      if (order.has_reviewed === true) {
        throw new Error("ALREADY_REVIEWED");
      }

      // Fetch global settings to verify the reward is active (defaults true
      // when the row or the flag is missing — same fallback as Firestore).
      const settingsRows = await tx<{ value: { isReviewRewardActive?: boolean } | null }[]>`
        select value from settings where key = 'global' limit 1
      `;
      const settings = settingsRows[0]?.value ?? null;
      const isRewardActive = settings ? settings.isReviewRewardActive !== false : true;

      const review = { reaction, createdAt: new Date().toISOString() };
      await tx`
        update orders
        set has_reviewed = true,
            review = ${tx.json(review)}
        where id = ${orderId}
      `;

      if (isRewardActive) {
        // Credit the order owner — same id we used for the ownership check.
        const ownerId = order.user_id ?? userId;
        await tx`
          update users
          set referral_credits = referral_credits + 1
          where id = ${ownerId}
        `;
        creditsAdded = 1;
      }
    });

    return NextResponse.json({ ok: true, creditsAdded });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "";
    console.error("REVIEW_TRANSACTION_FAILED", msg);
    if (msg === "ORDER_NOT_FOUND") {
      return bad("Commande introuvable.", 404);
    }
    if (msg === "FORBIDDEN") {
      return bad("Vous n'êtes pas autorisé à évaluer cette commande.", 403);
    }
    if (msg === "ORDER_NOT_DELIVERED") {
      return bad("Vous ne pouvez évaluer qu'une commande livrée.", 400);
    }
    if (msg === "ALREADY_REVIEWED") {
      return bad("Vous avez déjà soumis un avis pour cette commande.", 400);
    }
    return bad("Erreur interne lors de l'enregistrement de l'avis.", 500);
  }
}
