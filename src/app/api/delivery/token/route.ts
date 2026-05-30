import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { randomBytes, createHash } from "crypto";

// =============================================================================
// POST /api/delivery/token  — ADMIN ONLY
// =============================================================================
// Issues a single-use, short-lived delivery token bound to an order. The admin
// dashboard calls this when showing the hand-off QR; the QR encodes the token.
// The customer later submits it to POST /api/delivery/confirm. Only the SHA-256
// hash of the token is stored on the order, so a Firestore read never reveals a
// usable token. Replaces the removed client-side self-confirm path (Vague1-B).
// =============================================================================

const TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes

function unauthorized(msg = "Non autorisé.") {
  return NextResponse.json({ error: msg }, { status: 401 });
}

export async function POST(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return unauthorized("Token manquant.");
  const idToken = authHeader.split("Bearer ")[1];

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(idToken);
  } catch {
    return unauthorized("Token invalide ou expiré.");
  }

  // Admin gate: caller must have role "admin" in their user document.
  try {
    const callerSnap = await adminDb.collection("users").doc(decoded.uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
      return NextResponse.json({ error: "Accès réservé à l'administrateur." }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Erreur d'autorisation." }, { status: 500 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Format JSON invalide." }, { status: 400 });
  }

  const orderId = typeof body.orderId === "string" ? body.orderId.trim() : "";
  if (!orderId || orderId.length > 200) {
    return NextResponse.json({ error: "orderId invalide." }, { status: 400 });
  }

  try {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const orderSnap = await orderRef.get();
    if (!orderSnap.exists) {
      return NextResponse.json({ error: "Commande introuvable." }, { status: 404 });
    }

    const token = randomBytes(24).toString("base64url");
    const tokenHash = createHash("sha256").update(token).digest("hex");

    await orderRef.update({
      deliveryTokenHash: tokenHash,
      deliveryTokenExp: Date.now() + TOKEN_TTL_MS,
    });

    return NextResponse.json({ ok: true, orderId, token, expiresInMs: TOKEN_TTL_MS });
  } catch (e) {
    console.error("DELIVERY_TOKEN_FAILED", (e as { code?: string }).code ?? "unknown");
    return NextResponse.json({ error: "Erreur lors de la génération du token." }, { status: 500 });
  }
}
