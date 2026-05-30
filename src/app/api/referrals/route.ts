import { NextResponse } from "next/server";
import { adminDb, adminAuth, verifyAppCheckToken } from "@/lib/firebase-admin";
import { checkRateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/utils";

export async function GET(request: Request) {
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
    const referredQueryById = adminDb.collection("users").where("referredBy", "==", userId).get();
    let referredQueryByCode = null;
    if (referralCode) {
      referredQueryByCode = adminDb.collection("users").where("referredBy", "==", referralCode).get();
    }

    const [snapId, snapCode] = await Promise.all([
      referredQueryById,
      referredQueryByCode ? referredQueryByCode : Promise.resolve({ docs: [] })
    ]);

    // Merge unique matches by document ID
    const mergedDocs = new Map();
    snapId.docs.forEach(doc => mergedDocs.set(doc.id, doc.data()));
    snapCode.docs.forEach(doc => mergedDocs.set(doc.id, doc.data()));

    const list = Array.from(mergedDocs.values()).map(data => {
      const name = data.name || "Membre Afro";
      const words = name.split(" ");
      const maskedName = words[0] + (words[1] ? ` ${words[1][0]}.` : "");
      
      const ordersCount = typeof data.ordersCount === 'number' ? data.ordersCount : 0;
      const joinedAt = data.createdAt 
        ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) 
        : new Date().toISOString();

      return {
        name: maskedName,
        joinedAt,
        ordersCount,
        hasContributed: ordersCount > 0 // Friend completed their first order
      };
    });

    // Sort by joinedAt desc
    list.sort((a: any, b: any) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());

    return NextResponse.json({ referrals: list });
  } catch (err: any) {
    console.error("REFERRALS_FETCH_FAILED", err.message);
    return NextResponse.json({ error: "Erreur lors de la récupération des parrainages." }, { status: 500 });
  }
}
