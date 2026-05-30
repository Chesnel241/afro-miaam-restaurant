import { NextResponse } from "next/server";
import { adminDb, adminAuth, verifyAppCheckToken, adminUnavailableResponse } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/utils";

export async function GET(request: Request) {
  // Vague3-K: fail-CLOSED with 503 if Admin SDK has no credentials.
  const unavail = adminUnavailableResponse();
  if (unavail) return unavail;

  const appCheckToken = request.headers.get("X-Firebase-AppCheck");
  if (process.env.NODE_ENV === "production") {
    if (!appCheckToken) {
      return NextResponse.json({ error: "Non autorisÃ©. App Check manquant." }, { status: 401 });
    }
    try {
      await verifyAppCheckToken(appCheckToken);
    } catch {
      return NextResponse.json({ error: "Non autorisÃ©. App Check invalide ou expirÃ©." }, { status: 401 });
    }
  } else if (appCheckToken) {
    try {
      await verifyAppCheckToken(appCheckToken);
    } catch (e) {
      console.warn("APP_CHECK_VERIFY_FAILED", (e as { code?: string }).code ?? "unknown");
    }
  }

  // Coarse pre-auth IP guard (hardened clientIp) protecting verifyIdToken from
  // unauthenticated floods.
  if (!(await checkRateLimit(`referrals:ip:${clientIp(request)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  // Authentication validation via Admin SDK
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 401 });
  }
  const token = authHeader.split("Bearer ")[1];
  let decodedToken;
  try {
    decodedToken = await adminAuth.verifyIdToken(token);
  } catch (e) {
    return NextResponse.json({ error: "Token invalide." }, { status: 401 });
  }
  const userId = decodedToken.uid;

  // Per-uid rate limit keyed on the unspoofable, verified Firebase uid.
  if (!(await checkRateLimit(`referrals:uid:${userId}`, 30, 60_000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  try {
    // 1. Get the user's own profile to retrieve their referralCode
    const userSnap = await adminDb.collection("users").doc(userId).get();
    if (!userSnap.exists) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const userData = userSnap.data() || {};
    const referralCode = userData.referralCode || "";

    // 2. Query other users who were referred by this userId OR by their referralCode
    // Combine into a single 'in' query to reduce billing and improve performance
    const searchValues = Array.from(new Set([userId, referralCode].filter(Boolean)));
    const referredQuery = await adminDb.collection("users")
      .where("referredBy", "in", searchValues)
      .limit(100)
      .get();

    // Map matches by document ID
    const mergedDocs = new Map();
    referredQuery.docs.forEach(doc => mergedDocs.set(doc.id, doc.data()));

    // Vague3-J: minimize PII returned to the referrer.
    //   - name: initials only ("M. D.") instead of "Marie D." — first names
    //     plus exact join time + activity were a strong fingerprint for de-
    //     anonymizing specific individuals.
    //   - replace the exact ISO joinedAt with a coarse month-bucket string
    //     ("Il y a 3 mois") to neutralize fine-grained timing inference,
    //     while keeping enough signal for the referrer's UX.
    const initialOnly = (raw: string | undefined) => {
      if (!raw || typeof raw !== "string") return "";
      const c = raw.trim().charAt(0).toUpperCase();
      return c ? `${c}.` : "";
    };
    const joinedBucket = (createdAt: any): string => {
      let d: Date | null = null;
      try {
        if (createdAt?.toDate) d = createdAt.toDate();
        else if (typeof createdAt === "string") d = new Date(createdAt);
      } catch { /* fall through */ }
      if (!d || Number.isNaN(d.getTime())) return "Récemment";
      const months = Math.max(0, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)));
      if (months <= 0) return "Récemment";
      if (months === 1) return "Il y a 1 mois";
      if (months < 12) return `Il y a ${months} mois`;
      const years = Math.floor(months / 12);
      return years === 1 ? "Il y a 1 an" : `Il y a ${years} ans`;
    };

    const list = Array.from(mergedDocs.values()).map(data => {
      const name = typeof data.name === "string" ? data.name : "Membre Afro";
      const words = name.trim().split(/\s+/);
      const maskedName = `${initialOnly(words[0])}${words[1] ? ` ${initialOnly(words[1])}` : ""}`.trim() || "M.";
      const ordersCount = typeof data.ordersCount === "number" ? data.ordersCount : 0;
      return {
        name: maskedName,
        joinedBucket: joinedBucket(data.createdAt),
        ordersCount,
        hasContributed: ordersCount > 0,
      };
    });

    // Sort by recency proxy: contributed first, then by ordersCount desc — we
    // intentionally no longer expose exact join timestamps client-side.
    list.sort((a, b) => Number(b.hasContributed) - Number(a.hasContributed) || b.ordersCount - a.ordersCount);

    return NextResponse.json(
      { referrals: list },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          "Vary": "Authorization"
        }
      }
    );
  } catch (err: any) {
    console.error("REFERRALS_FETCH_FAILED", err.message);
    return NextResponse.json({ error: "Erreur lors de la récupération des parrainages." }, { status: 500 });
  }
}
