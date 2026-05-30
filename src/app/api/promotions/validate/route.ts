import { NextResponse } from "next/server";
import { adminDb, adminAuth, verifyAppCheckToken, adminUnavailableResponse } from "@/lib/firebase-admin";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  // Vague3-K: fail-CLOSED with 503 if Admin SDK has no credentials.
  const unavail = adminUnavailableResponse();
  if (unavail) return unavail;

  // Coarse pre-auth IP guard protecting verifyIdToken from unauthenticated floods.
  if (!(await checkRateLimit(`promo:ip:${clientIp(request)}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  // App Check: enforced in production; in dev, verify-if-present but never block.
  const appCheckToken = request.headers.get("X-Firebase-AppCheck");
  if (process.env.NODE_ENV === "production") {
    if (!appCheckToken) {
      return bad("Non autorisé. App Check manquant.", 401);
    }
    try {
      await verifyAppCheckToken(appCheckToken);
    } catch {
      return bad("Non autorisé. App Check invalide ou expiré.", 401);
    }
  } else if (appCheckToken) {
    try {
      await verifyAppCheckToken(appCheckToken);
    } catch (e) {
      console.warn("APP_CHECK_VERIFY_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }

  // Authentication validation via Admin SDK.
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return bad("Non autorisé. Token manquant.", 401);
  }
  const token = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (e) {
    return bad("Non autorisé. Token invalide ou expiré.", 401);
  }
  const uid = decodedToken.uid;

  // Per-uid rate limit keyed on the unspoofable, verified Firebase uid.
  if (!(await checkRateLimit(`promo:uid:${uid}`, 30, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  let payload: { code?: unknown };
  try {
    payload = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  const rawCode = payload?.code;
  if (typeof rawCode !== "string") {
    return bad("Code manquant ou invalide.");
  }
  const code = rawCode.trim().toUpperCase();
  if (code.length < 1 || code.length > 40) {
    return bad("Code manquant ou invalide.");
  }

  try {
    const snap = await adminDb.collection("settings").doc("promotions").get();
    if (!snap.exists) {
      return NextResponse.json({ ok: false, reason: "unknown" });
    }
    const data = snap.data() || {};
    const codes = (data.codes && typeof data.codes === "object") ? data.codes : {};
    const codeData = codes[code];

    if (!codeData) {
      return NextResponse.json({ ok: false, reason: "unknown" });
    }
    if (codeData.isActive !== true) {
      return NextResponse.json({ ok: false, reason: "inactive" });
    }

    // Echo ONLY the matched code's relevant fields. Never enumerate other codes.
    return NextResponse.json({
      ok: true,
      code,
      discountType: codeData.discountType,
      discountValue: codeData.discountValue,
    });
  } catch (error) {
    console.error("PROMO_VALIDATE_FAILED", (error as { code?: string }).code ?? "unknown");
    return bad("Erreur interne lors de la vérification du code.", 500);
  }
}
