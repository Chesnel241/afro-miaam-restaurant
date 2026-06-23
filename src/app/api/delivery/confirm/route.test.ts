import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";

// ---------------------------------------------------------------------------
// Mocks — declared before importing the route.
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
      return Response.json({ error: "Erreur." }, { status: 500 });
    },
  };
});

vi.mock("@/lib/recaptcha", () => ({
  verifyRecaptcha: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn(async () => true),
}));

const { withTransactionMock } = vi.hoisted(() => ({ withTransactionMock: vi.fn() }));

vi.mock("@/lib/db", () => ({
  withTransaction: withTransactionMock,
}));

import { POST } from "./route";
import { requireAuth, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

// ---------------------------------------------------------------------------
// Tagged-template fake — records SQL strings + values, returns queued rows.
// ---------------------------------------------------------------------------
type Call = { sql: string; values: unknown[] };

function makeTx(queue: unknown[][]) {
  const calls: Call[] = [];
  const tx = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ sql: strings.join(" "), values });
    return Promise.resolve(queue.shift() ?? []);
  }) as ((s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>) & {
    calls: Call[];
    json: (v: unknown) => unknown;
  };
  tx.calls = calls;
  tx.json = (v: unknown) => v;
  return tx;
}

const ownerUid = "u1";
const ownerEmail = "owner@example.com";

const fakeClaims = {
  sub: ownerUid,
  email: ownerEmail,
  email_verified: true,
  role: "user" as const,
};

const RAW_TOKEN = "deadbeef".repeat(6); // 48 hex chars, matches issuer's shape
const TOKEN_HASH = createHash("sha256").update(RAW_TOKEN).digest("hex");

function orderRow(extra: Record<string, unknown> = {}) {
  return {
    id: "o1",
    user_id: ownerUid,
    user_email: ownerEmail,
    status: "En Livraison",
    delivery_token_hash: TOKEN_HASH,
    delivery_token_exp: Date.now() + 60_000,
    referrer_id: null,
    referral_reward_paid: false,
    ...extra,
  };
}

function confirmReq(body: unknown): Request {
  return new Request("http://localhost/api/delivery/confirm", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(fakeClaims);
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
});

// ===========================================================================
// Auth / shape / rate-limit
// ===========================================================================

describe("POST /api/delivery/confirm — auth & input validation", () => {
  it("401 when not authenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Non autorisé.", 401));
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(401);
  });

  it("429 when the per-IP rate limit is exhausted (pre-auth)", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(429);
  });

  it("400 on malformed JSON", async () => {
    const req = new Request("http://localhost/api/delivery/confirm", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("400 on missing orderId", async () => {
    const res = await POST(confirmReq({ token: RAW_TOKEN }));
    expect(res.status).toBe(400);
  });

  it("400 on missing token", async () => {
    const res = await POST(confirmReq({ orderId: "o1" }));
    expect(res.status).toBe(400);
  });

  it("400 on oversized orderId / token (> 200 chars)", async () => {
    const r1 = await POST(confirmReq({ orderId: "a".repeat(201), token: RAW_TOKEN }));
    expect(r1.status).toBe(400);
    const r2 = await POST(confirmReq({ orderId: "o1", token: "b".repeat(201) }));
    expect(r2.status).toBe(400);
  });
});

// ===========================================================================
// DB transaction outcomes
// ===========================================================================

describe("POST /api/delivery/confirm — state transitions", () => {
  it("404 when the order does not exist", async () => {
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(404);
  });

  it("403 when neither uid nor email matches the order owner", async () => {
    // Different user_id, different user_email -> FORBIDDEN
    const row = orderRow({ user_id: "someone-else", user_email: "stranger@example.com" });
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(403);
  });

  it("403 when the email matches but is NOT verified (no email fallback)", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...fakeClaims,
      sub: "other-user",
      email_verified: false,
    });
    // user_email matches but the JWT says email_verified=false → fallback denied.
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[orderRow({ user_id: "other-row-uid" })]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(403);
  });

  it("200 when ownership is via verified-email fallback (uid mismatch ok)", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ...fakeClaims,
      sub: "different-uid", // different from row.user_id
      email_verified: true,
      email: ownerEmail,
    });
    const row = orderRow({ user_id: "the-original-uid" });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      // queue: SELECT FOR UPDATE → row; UPDATE status → []; orders_count++ → []
      tx = makeTx([[row], [], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
  });

  it("409 when the order is already 'Livré'", async () => {
    const row = orderRow({ status: "Livré" });
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it("409 when the status is not in the deliverable whitelist", async () => {
    const row = orderRow({ status: "Attente Acompte" });
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it("409 when no delivery token is active on the order (hash NULL)", async () => {
    const row = orderRow({ delivery_token_hash: null });
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(409);
  });

  it("410 when the delivery token has expired", async () => {
    const row = orderRow({ delivery_token_exp: Date.now() - 1 });
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(410);
  });

  it("403 when the submitted token does not match the stored hash", async () => {
    const row = orderRow(); // hash is for RAW_TOKEN, submit a different token
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[row]])),
    );
    const res = await POST(confirmReq({ orderId: "o1", token: "wrongtokenwrongtokenwrongtokenwrongtokenwrong00" }));
    expect(res.status).toBe(403);
  });
});

// ===========================================================================
// Happy paths — side effects & idempotency
// ===========================================================================

describe("POST /api/delivery/confirm — side effects", () => {
  it("happy path: status → Livré, token consumed (NULL), orders_count++", async () => {
    const row = orderRow();
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      // queue: SELECT FOR UPDATE → row; UPDATE → []; orders_count++ → []
      tx = makeTx([[row], [], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("status = 'Livré'");
    // Token consumed in the same UPDATE — critical: replays of the same QR
    // within the TTL must be rejected.
    expect(sqls).toContain("delivery_token_hash = null");
    expect(sqls).toContain("delivery_token_exp = null");
    expect(sqls).toContain("orders_count = orders_count + 1");
    // No referrer on the row -> no referral credit.
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("credits the referrer +5€ and flips referral_reward_paid", async () => {
    const row = orderRow({ referrer_id: "ref-1", referral_reward_paid: false });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      // queue: SELECT → row; UPDATE Livré → []; orders_count++ → [];
      //        referral_credits += 5 → []; referral_reward_paid = true → []
      tx = makeTx([[row], [], [], [], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("referral_credits = referral_credits + 5");
    expect(sqls).toContain("referral_reward_paid = true");
  });

  it("does NOT credit the referrer when referral_reward_paid is already true", async () => {
    const row = orderRow({ referrer_id: "ref-1", referral_reward_paid: true });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[row], [], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("orders_count = orders_count + 1");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("does NOT credit the referrer on a self-referral (referrer === owner)", async () => {
    const row = orderRow({ referrer_id: ownerUid, referral_reward_paid: false });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[row], [], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("does NOT touch orders_count when user_id is null (guest order)", async () => {
    const row = orderRow({ user_id: null });
    // Ownership has to pass somehow: rely on verified-email fallback.
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[row], []]);
      return fn(tx);
    });
    const res = await POST(confirmReq({ orderId: "o1", token: RAW_TOKEN }));
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).not.toContain("orders_count = orders_count + 1");
  });
});
