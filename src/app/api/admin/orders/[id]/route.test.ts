import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — declared before importing the route. Use vi.hoisted for any value
// the hoisted vi.mock factory references.
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
    requireAdmin: vi.fn(),
    authErrorResponse: (e: unknown) => {
      if (e instanceof AuthError) {
        return Response.json({ error: e.message }, { status: e.status });
      }
      return Response.json({ error: "Erreur." }, { status: 500 });
    },
  };
});

const { getSqlMock, withTransactionMock } = vi.hoisted(() => ({
  getSqlMock: vi.fn(),
  withTransactionMock: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  getSql: getSqlMock,
  withTransaction: withTransactionMock,
}));

import { PATCH, DELETE } from "./route";
import { requireAdmin, AuthError } from "@/lib/auth";

// ---------------------------------------------------------------------------
// Recording tagged-template fake. Each call records the joined SQL string +
// values and returns the next queued result (default []).
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

const fakeAdmin = { sub: "admin-1", email: "a@x.com", email_verified: true, role: "admin" as const };

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/admin/orders/o1", {
    method: "PATCH",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = (id = "o1") => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.clearAllMocks();
  (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAdmin);
});

describe("PATCH /api/admin/orders/[id] — auth & validation", () => {
  it("401 when not admin (AuthError 401)", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Non autorisé.", 401));
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(401);
  });

  it("403 when role is not admin", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Accès refusé.", 403));
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(403);
  });

  it("400 on id containing a slash", async () => {
    const res = await PATCH(patchReq({ status: "Livré" }), ctx("a/b"));
    expect(res.status).toBe(400);
  });

  it("400 on invalid status", async () => {
    const res = await PATCH(patchReq({ status: "Pas un statut" }), ctx());
    expect(res.status).toBe(400);
  });

  it("accepts the 'En Livraison' status (new workflow state)", async () => {
    const before = {
      id: "o1", reference: "AM-1", user_id: "u1", user_name: "U", user_email: "u@x.com",
      items: [], subtotal: 10, delivery_fee: 0, total: 10, deposit_amount: 5, discounts: null,
      status: "En cours", customer: {}, referrer_id: null, referral_reward_paid: false,
      has_reviewed: false, review: null, delivery_token_hash: null, delivery_token_exp: null,
      delivered_at: null, deletion_requested: false, created_at: new Date(), updated_at: new Date(),
    };
    const updated = { ...before, status: "En Livraison" };
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) =>
      fn(makeTx([[before], [updated]])),
    );
    const res = await PATCH(patchReq({ status: "En Livraison" }), ctx());
    expect(res.status).toBe(200);
  });

  it("accepts the 'Rejetée' status (new terminal state)", async () => {
    const before = {
      id: "o1", reference: "AM-1", user_id: "u1", user_name: "U", user_email: "u@x.com",
      items: [], subtotal: 10, delivery_fee: 0, total: 10, deposit_amount: 5, discounts: null,
      status: "En cours", customer: {}, referrer_id: null, referral_reward_paid: false,
      has_reviewed: false, review: null, delivery_token_hash: null, delivery_token_exp: null,
      delivered_at: null, deletion_requested: false, created_at: new Date(), updated_at: new Date(),
    };
    const updated = { ...before, status: "Rejetée" };
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[before], [updated]]);
      return fn(tx);
    });
    const res = await PATCH(patchReq({ status: "Rejetée" }), ctx());
    expect(res.status).toBe(200);
    // Rejecting an order must NOT credit loyalty/referral side effects.
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).not.toContain("orders_count = orders_count + 1");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("400 on non-boolean deletionRequested", async () => {
    const res = await PATCH(patchReq({ deletionRequested: "yes" }), ctx());
    expect(res.status).toBe(400);
  });

  it("400 when no updatable field provided", async () => {
    const res = await PATCH(patchReq({}), ctx());
    expect(res.status).toBe(400);
  });

  it("404 when the order does not exist", async () => {
    // before = [] → not found
    withTransactionMock.mockImplementationOnce(async (fn: (tx: unknown) => Promise<unknown>) =>
      fn(makeTx([[]])),
    );
    const res = await PATCH(patchReq({ status: "En cours" }), ctx());
    expect(res.status).toBe(404);
  });
});

describe("PATCH — 'Livré' transition side effects", () => {
  function row(extra: Record<string, unknown> = {}) {
    return {
      id: "o1", reference: "AM-1", user_id: "u1", user_name: "U", user_email: "u@x.com",
      items: [], subtotal: 10, delivery_fee: 0, total: 10, deposit_amount: 5, discounts: null,
      status: "En cours", customer: {}, referrer_id: null, referral_reward_paid: false,
      has_reviewed: false, review: null, delivery_token_hash: null, delivery_token_exp: null,
      delivered_at: null, deletion_requested: false, created_at: new Date(), updated_at: new Date(),
      ...extra,
    };
  }

  it("increments orders_count + credits referrer +5 + flips referral_reward_paid", async () => {
    const before = row({ status: "En cours", referrer_id: "ref1", referral_reward_paid: false });
    const updated = row({ status: "Livré" });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      // queue: SELECT FOR UPDATE → [before]; UPDATE → [updated]; side effects → []
      tx = makeTx([[before], [updated], [], [], []]);
      return fn(tx);
    });
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("orders_count = orders_count + 1");
    expect(sqls).toContain("referral_credits = referral_credits + 5");
    expect(sqls).toContain("referral_reward_paid = true");
  });

  it("no double-credit when previous status was already 'Livré'", async () => {
    const before = row({ status: "Livré", referrer_id: "ref1" });
    const updated = row({ status: "Livré" });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[before], [updated]]);
      return fn(tx);
    });
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).not.toContain("orders_count = orders_count + 1");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("no referrer reward when referral_reward_paid already true (only orders_count++)", async () => {
    const before = row({ status: "En cours", referrer_id: "ref1", referral_reward_paid: true });
    const updated = row({ status: "Livré" });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[before], [updated], []]);
      return fn(tx);
    });
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("orders_count = orders_count + 1");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });

  it("no referrer reward when there is no referrer (only orders_count++)", async () => {
    const before = row({ status: "En cours", referrer_id: null });
    const updated = row({ status: "Livré" });
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([[before], [updated], []]);
      return fn(tx);
    });
    const res = await PATCH(patchReq({ status: "Livré" }), ctx());
    expect(res.status).toBe(200);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("orders_count = orders_count + 1");
    expect(sqls).not.toContain("referral_credits = referral_credits + 5");
  });
});

describe("DELETE /api/admin/orders/[id]", () => {
  it("404 when not found", async () => {
    const sql = makeTx([[]]);
    getSqlMock.mockReturnValueOnce(sql);
    const req = new Request("http://localhost/api/admin/orders/o1", {
      method: "DELETE",
      headers: { Authorization: "Bearer t" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(404);
  });

  it("rolls back orders_count when the deleted order was 'Livré'", async () => {
    const deleted = { id: "o1", status: "Livré", user_id: "u1" };
    const sql = makeTx([[deleted], []]);
    getSqlMock.mockReturnValueOnce(sql);
    const req = new Request("http://localhost/api/admin/orders/o1", {
      method: "DELETE",
      headers: { Authorization: "Bearer t" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    const sqls = sql.calls.map((c) => c.sql).join("\n");
    expect(sqls).toContain("orders_count = GREATEST(orders_count - 1, 0)");
  });

  it("does NOT roll back orders_count when the order was not delivered", async () => {
    const deleted = { id: "o1", status: "En cours", user_id: "u1" };
    const sql = makeTx([[deleted]]);
    getSqlMock.mockReturnValueOnce(sql);
    const req = new Request("http://localhost/api/admin/orders/o1", {
      method: "DELETE",
      headers: { Authorization: "Bearer t" },
    });
    const res = await DELETE(req, { params: Promise.resolve({ id: "o1" }) });
    expect(res.status).toBe(200);
    const sqls = sql.calls.map((c) => c.sql).join("\n");
    expect(sqls).not.toContain("orders_count = GREATEST");
  });
});
