import { NextResponse } from "next/server";
import { requireAuth, authErrorResponse } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { getSql } from "@/lib/db";
import { clientIp } from "@/lib/utils";

// =============================================================================
// GET /api/referrals — referrer's dashboard data
// =============================================================================
// Returns the caller's referral code + credit balance, plus a masked list of
// users they have referred. Vague3-J PII minimization is preserved here: the
// name is reduced to initials and the join date is replaced with a coarse
// month-bucket string ("Il y a 3 mois") so fine-grained timing can't be used
// to de-anonymize specific individuals.
// =============================================================================

export async function GET(request: Request) {
  // Coarse pre-auth IP guard protecting the JWT verify path from floods.
  if (!(await checkRateLimit(`referrals:ip:${clientIp(request)}`, 30, 60_000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  let claims;
  try {
    claims = await requireAuth(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const userId = claims.sub;

  // Per-uid rate limit keyed on the unspoofable, verified JWT subject.
  if (!(await checkRateLimit(`referrals:uid:${userId}`, 30, 60_000))) {
    return NextResponse.json({ error: "Trop de requêtes." }, { status: 429 });
  }

  // reCAPTCHA (fail-closed in production). GET has no body, so we read the
  // token from the X-Recaptcha-Token header; missing in dev is a no-op.
  if (process.env.NODE_ENV === "production") {
    const headerToken = request.headers.get("X-Recaptcha-Token");
    const ok = await verifyRecaptcha(headerToken, {
      remoteIp: clientIp(request),
    });
    if (!ok) {
      return NextResponse.json(
        { error: "Vérification reCAPTCHA échouée." },
        { status: 401 },
      );
    }
  }

  const sql = getSql();

  try {
    // 1. Look up the caller's own profile to surface their referral code.
    const userRows = await sql<
      { id: string; name: string; referral_code: string; referral_credits: string | number }[]
    >`
      select id, name, referral_code, referral_credits
      from users
      where id = ${userId} and deleted_at is null
      limit 1
    `;
    if (userRows.length === 0) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }
    const me = userRows[0];

    // 2. Pull the (masked) list of users this caller has referred. Limit to 100
    //    — the dashboard is informational, not a paged report.
    const referredRows = await sql<
      { name: string | null; created_at: Date | string; orders_count: number }[]
    >`
      select name, created_at, orders_count
      from users
      where referred_by = ${userId} and deleted_at is null
      order by created_at desc
      limit 100
    `;

    // Vague3-J: minimize PII returned to the referrer.
    //   - name: initials only ("M. D.") instead of "Marie Dupont" — first
    //     names + exact join time + activity were a strong fingerprint for
    //     de-anonymizing specific individuals.
    //   - replace exact join timestamps with a coarse month-bucket string to
    //     neutralize fine-grained timing inference while keeping enough signal
    //     for the referrer's UX.
    const initialOnly = (raw: string | undefined | null) => {
      if (!raw || typeof raw !== "string") return "";
      const c = raw.trim().charAt(0).toUpperCase();
      return c ? `${c}.` : "";
    };
    const joinedBucket = (createdAt: Date | string | null): string => {
      let d: Date | null = null;
      try {
        if (createdAt instanceof Date) d = createdAt;
        else if (typeof createdAt === "string") d = new Date(createdAt);
      } catch {
        /* fall through */
      }
      if (!d || Number.isNaN(d.getTime())) return "Récemment";
      const months = Math.max(
        0,
        Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30)),
      );
      if (months <= 0) return "Récemment";
      if (months === 1) return "Il y a 1 mois";
      if (months < 12) return `Il y a ${months} mois`;
      const years = Math.floor(months / 12);
      return years === 1 ? "Il y a 1 an" : `Il y a ${years} ans`;
    };

    const list = referredRows.map((row) => {
      const name = typeof row.name === "string" ? row.name : "Membre Afro";
      const words = name.trim().split(/\s+/);
      const maskedName =
        `${initialOnly(words[0])}${words[1] ? ` ${initialOnly(words[1])}` : ""}`.trim() || "M.";
      const ordersCount = typeof row.orders_count === "number" ? row.orders_count : 0;
      return {
        name: maskedName,
        joinedBucket: joinedBucket(row.created_at),
        ordersCount,
        hasContributed: ordersCount > 0,
      };
    });

    // Sort by recency proxy: contributed first, then by ordersCount desc — we
    // intentionally no longer expose exact join timestamps client-side.
    list.sort(
      (a, b) =>
        Number(b.hasContributed) - Number(a.hasContributed) ||
        b.ordersCount - a.ordersCount,
    );

    return NextResponse.json(
      {
        ok: true,
        referralCode: me.referral_code,
        referralCredits: Number(me.referral_credits),
        referrals: list,
      },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
          Vary: "Authorization",
        },
      },
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "";
    console.error("REFERRALS_FETCH_FAILED", msg);
    return NextResponse.json(
      { error: "Erreur lors de la récupération des parrainages." },
      { status: 500 },
    );
  }
}
