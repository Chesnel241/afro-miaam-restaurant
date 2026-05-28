import { NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit";

function bad(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

export async function POST(request: Request) {
  if (!(await checkRateLimit(`review:${clientIp(request)}`, 15, 60_000))) {
    return bad("Trop de requêtes. Réessayez dans une minute.", 429);
  }

  // Authentication validation via Admin SDK
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
  const userId = decodedToken.uid;
  const userEmail = (decodedToken.email || "").trim().toLowerCase();

  let payload: { orderId?: string; reaction?: "bon" | "moyen" | "pas_bon" };
  try {
    payload = await request.json();
  } catch {
    return bad("Format JSON invalide.");
  }

  const { orderId, reaction } = payload;
  if (!orderId || !reaction || !["bon", "moyen", "pas_bon"].includes(reaction)) {
    return bad("Paramètres manquants ou invalides.");
  }

  try {
    const orderRef = adminDb.collection("orders").doc(orderId);
    const userRef = adminDb.collection("users").doc(userId);

    let creditsAdded = 0;

    await adminDb.runTransaction(async (tx) => {
      const orderSnap = await tx.get(orderRef);
      if (!orderSnap.exists) {
        throw new Error("ORDER_NOT_FOUND");
      }

      const orderData = orderSnap.data() || {};
      
      // Ownership check (uid or email)
      const isOwnerByUid = orderData.userId === userId;
      const isOwnerByEmail = typeof orderData.userEmail === 'string' &&
        orderData.userEmail.trim().toLowerCase() === userEmail;

      if (!isOwnerByUid && !isOwnerByEmail) {
        throw new Error("FORBIDDEN");
      }

      // Check order status
      if (orderData.status !== "Livré") {
        throw new Error("ORDER_NOT_DELIVERED");
      }

      // Check duplicate review
      if (orderData.hasReviewed === true) {
        throw new Error("ALREADY_REVIEWED");
      }

      // Fetch global settings to verify if reward is active
      const settingsSnap = await tx.get(adminDb.collection("settings").doc("global"));
      const settingsData = settingsSnap.data();
      let isRewardActive = true;
      if (settingsSnap.exists && settingsData) {
        isRewardActive = settingsData.isReviewRewardActive !== false;
      }

      // Update Order document
      tx.update(orderRef, {
        hasReviewed: true,
        review: {
          reaction,
          createdAt: FieldValue.serverTimestamp()
        }
      });

      // Reward credits if active
      if (isRewardActive) {
        tx.update(userRef, {
          referralCredits: FieldValue.increment(1)
        });
        creditsAdded = 1;
      }
    });

    return NextResponse.json({ ok: true, creditsAdded });
  } catch (error: any) {
    console.error("REVIEW_TRANSACTION_FAILED", error.message);
    if (error.message === "ORDER_NOT_FOUND") {
      return bad("Commande introuvable.", 404);
    }
    if (error.message === "FORBIDDEN") {
      return bad("Vous n'êtes pas autorisé à évaluer cette commande.", 403);
    }
    if (error.message === "ORDER_NOT_DELIVERED") {
      return bad("Vous ne pouvez évaluer qu'une commande livrée.", 400);
    }
    if (error.message === "ALREADY_REVIEWED") {
      return bad("Vous avez déjà soumis un avis pour cette commande.", 400);
    }
    return bad("Erreur interne lors de l'enregistrement de l'avis.", 500);
  }
}
