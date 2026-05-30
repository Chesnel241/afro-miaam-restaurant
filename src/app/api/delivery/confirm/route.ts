import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { createHash, timingSafeEqual } from "crypto";

// =============================================================================
// POST /api/delivery/confirm — customer confirms receipt via admin-issued token
// =============================================================================
// Replaces the removed client-side self-confirm path (Vague1-B). The customer
// scans the admin's hand-off QR (which carries a single-use token) and lands on
// /valider-commande/[id]?t=<token>. This route validates, server-side:
//   1. the caller owns the order (uid; verified-email fallback),
//   2. the order is in a delivery-eligible state,
//   3. the submitted token matches the stored hash, is unexpired, unused.
// On success it atomically sets status="Livré", consumes the token, and applies
// the loyalty/referral side-effects — none of which the client can forge.
// =============================================================================

const DELIVERABLE = ["Acompte Reçu", "En attente", "En cours"];

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
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return bad("Non autorisé. Token manquant.", 401);
  const idToken = authHeader.split("Bearer ")[1];

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return bad("Non autorisé. Token invalide ou expiré.", 401);
  }
  const uid = decoded.uid;
  const email = (decoded.email || "").trim().toLowerCase();
  const emailVerified = decoded.email_verified === true;

  let body: { orderId?: string; token?: string };
  try {
    body = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }
  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!orderId || orderId.length > 200) return bad("orderId invalide.");
  if (!token || token.length > 200) return bad("Jeton de livraison manquant ou invalide.");

  const submittedHash = createHash("sha256").update(token).digest("hex");

  try {
    const orderRef = adminDb.collection("orders").doc(orderId);

    await adminDb.runTransaction(async (tx) => {
      const snap = await tx.get(orderRef);
      if (!snap.exists) throw new Error("ORDER_NOT_FOUND");
      const order = snap.data() || {};

      // Ownership: uid match, or verified-email match as a fallback.
      const ownByUid = order.userId === uid;
      const ownByEmail =
        emailVerified &&
        typeof order.userEmail === "string" &&
        order.userEmail.trim().toLowerCase() === email;
      if (!ownByUid && !ownByEmail) throw new Error("FORBIDDEN");

      if (order.status === "Livré") throw new Error("ALREADY_DELIVERED");
      if (!DELIVERABLE.includes(order.status)) throw new Error("NOT_DELIVERABLE");

      const storedHash = typeof order.deliveryTokenHash === "string" ? order.deliveryTokenHash : "";
      const exp = typeof order.deliveryTokenExp === "number" ? order.deliveryTokenExp : 0;
      if (!storedHash) throw new Error("NO_TOKEN");
      if (Date.now() > exp) throw new Error("TOKEN_EXPIRED");
      if (!hashesEqual(submittedHash, storedHash)) throw new Error("TOKEN_MISMATCH");

      // Transition + single-use consumption.
      tx.update(orderRef, {
        status: "Livré",
        deliveredAt: new Date().toISOString(),
        deliveryTokenHash: FieldValue.delete(),
        deliveryTokenExp: FieldValue.delete(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      // Loyalty + referral side-effects (server-authoritative, applied once on
      // the non-Livré -> Livré transition, mirroring the admin dashboard path).
      const ownerId = typeof order.userId === "string" ? order.userId : "";
      if (ownerId) {
        tx.update(adminDb.collection("users").doc(ownerId), {
          ordersCount: FieldValue.increment(1),
        });
      }
      const referrerId = typeof order.referrerId === "string" ? order.referrerId : "";
      if (referrerId && referrerId !== ownerId) {
        tx.update(adminDb.collection("users").doc(referrerId), {
          referralCredits: FieldValue.increment(5),
        });
      }
    });

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const code = e?.message;
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
    console.error("DELIVERY_CONFIRM_FAILED", (e as { code?: string }).code ?? "unknown");
    return bad("Erreur lors de la confirmation de la livraison.", 500);
  }
}
