import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/admin/newsletter — admin-only listing of subscribers.
 */

export const dynamic = "force-dynamic";

type NewsletterRow = {
  id: string;
  email: string;
  source: string | null;
  created_at: Date;
};

function mapSubscriber(row: NewsletterRow) {
  return {
    id: row.id,
    email: row.email,
    source: row.source,
    createdAt: row.created_at,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin(request);
  } catch (e) {
    return authErrorResponse(e);
  }

  const sql = getSql();
  const rows = await sql<NewsletterRow[]>`
    SELECT id, email, source, created_at
    FROM newsletter
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json(
    { ok: true, subscribers: rows.map(mapSubscriber) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
