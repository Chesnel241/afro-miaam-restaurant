import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (must precede the route import).
// ---------------------------------------------------------------------------

vi.mock("@/lib/auth", () => {
  class AuthError extends Error {
    status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }
  return {
    AuthError,
    requireAuth: vi.fn(),
    authErrorResponse: (e: unknown) => {
      if (e instanceof AuthError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      return Response.json({ error: "Non autorisé." }, { status: 401 });
    },
  };
});

vi.mock("@/lib/recaptcha", () => ({
  verifyRecaptcha: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/db", () => ({
  getSql: vi.fn(),
  withTransaction: vi.fn(),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    clientIp: vi.fn(() => "127.0.0.1"),
  };
});

import { GET } from "./route";
import { requireAuth, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { getSql } from "@/lib/db";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeRow = Record<string, unknown>;

/**
 * Build a fake `sql`-tagged template that returns queued result sets in order.
 */
function makeSql(rowQueue: FakeRow[][]) {
  const calls: { strings: TemplateStringsArray; values: unknown[] }[] = [];
  const sql: any = vi.fn(
    (strings: TemplateStringsArray, ...values: unknown[]) => {
      calls.push({ strings, values });
      const next = rowQueue.shift();
      return Promise.resolve(next ?? []);
    },
  );
  return { sql, calls };
}

const fakeClaims = {
  sub: "user-123",
  email: "test@test.com",
  email_verified: true,
  role: "customer" as const,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("GET /api/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as any).mockResolvedValue(true);
  });

  it("should return 401 if Authorization header is missing", async () => {
    (requireAuth as any).mockRejectedValue(new AuthError("Non autorisé.", 401));
    const req = new Request("http://localhost/api/referrals", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if token is invalid", async () => {
    (requireAuth as any).mockRejectedValue(new AuthError("Token invalide.", 401));
    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 429 when the pre-auth IP rate limiter denies", async () => {
    (checkRateLimit as any).mockResolvedValueOnce(false);
    const res = await GET(
      new Request("http://localhost/api/referrals", {
        method: "GET",
        headers: { Authorization: "Bearer mock-token" },
      }),
    );
    expect(res.status).toBe(429);
  });

  it("should return 404 if user is not found", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    const { sql } = makeSql([
      // SELECT user → no rows
      [],
    ]);
    (getSql as any).mockReturnValue(sql);

    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("should return referrals properly mapped and sorted", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    const { sql } = makeSql([
      // SELECT caller's user row
      [
        {
          id: fakeClaims.sub,
          name: "Marie Dupont",
          referral_code: "REF123",
          referral_credits: "12",
        },
      ],
      // SELECT referred users
      [
        {
          name: "Alice Dupont",
          orders_count: 2,
          created_at: new Date("2026-05-20T10:00:00Z"),
        },
        {
          name: "Bob Martin",
          orders_count: 0,
          created_at: new Date("2026-05-25T10:00:00Z"),
        },
      ],
    ]);
    (getSql as any).mockReturnValue(sql);

    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();

    expect(data.ok).toBe(true);
    expect(data.referralCode).toBe("REF123");
    expect(data.referralCredits).toBe(12);

    expect(data.referrals.length).toBe(2);
    // Vague3-J: names are masked to initials only ("A. D.") and the list is
    // sorted by hasContributed desc, then ordersCount desc — exact join
    // timestamps are no longer exposed client-side.
    expect(data.referrals[0].name).toBe("A. D.");
    expect(data.referrals[0].hasContributed).toBe(true);
    expect(data.referrals[0].ordersCount).toBe(2);
    expect(data.referrals[0].joinedBucket).toBeTypeOf("string");

    expect(data.referrals[1].name).toBe("B. M.");
    expect(data.referrals[1].hasContributed).toBe(false);
    expect(data.referrals[1].ordersCount).toBe(0);
    expect(data.referrals[1].joinedBucket).toBeTypeOf("string");
  });
});
