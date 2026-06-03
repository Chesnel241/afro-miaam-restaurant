import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { requireAdmin, authErrorResponse } from "@/lib/auth";

/**
 * GET /api/admin/prestations — admin-only listing of contact/event requests.
 */

export const dynamic = "force-dynamic";

type PrestationRow = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  type: string | null;
  message: string | null;
  user_id: string | null;
  created_at: Date;
};

function mapPrestation(row: PrestationRow) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone,
    type: row.type,
    message: row.message,
    userId: row.user_id,
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
  const rows = await sql<PrestationRow[]>`
    SELECT id, email, name, phone, type, message, user_id, created_at
    FROM prestations
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json(
    { ok: true, requests: rows.map(mapPrestation) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
