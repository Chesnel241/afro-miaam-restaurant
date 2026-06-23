import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks — must be declared before importing the route.
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

vi.mock("@/lib/recaptcha", () => ({
  verifyRecaptcha: vi.fn(async () => true),
}));

vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn(async () => true),
}));

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));

vi.mock("@/lib/db", () => ({
  getSql: getSqlMock,
}));

import { POST } from "./route";
import { requireAdmin, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

// ---------------------------------------------------------------------------
// Tagged-template fake. The route uses postgres.js in TWO shapes:
//   - tagged template:  sql`update ... where status in ${sql(LIST)}`
//   - function call:    sql(LIST)   → expands an IN-list (no SQL fired)
// Only the tagged-template form consumes the result queue; the function-call
// form just hands the value back so it lands in the outer template values.
// ---------------------------------------------------------------------------
type Call = { sql: string; values: unknown[] };

function isTemplateStrings(arg: unknown): arg is TemplateStringsArray {
  return Array.isArray(arg) && Object.prototype.hasOwnProperty.call(arg, "raw");
}

function makeSql(queue: unknown[][]) {
  const calls: Call[] = [];
  // Variadic: real postgres.js is both a tagged-template fn and a callable.
  function sqlImpl(...args: unknown[]): unknown {
    if (args.length > 0 && isTemplateStrings(args[0])) {
      const strings = args[0] as TemplateStringsArray;
      const values = args.slice(1);
      calls.push({ sql: strings.join(" "), values });
      return Promise.resolve(queue.shift() ?? []);
    }
    // Function-call form (IN-list expansion etc.) — no SQL, no queue consumed.
    return args[0];
  }
  const sql = sqlImpl as ((...a: unknown[]) => unknown) & { calls: Call[] };
  sql.calls = calls;
  return sql;
}

const fakeAdmin = { sub: "admin-1", email: "a@x.com", email_verified: true, role: "admin" as const };

function tokenReq(body: unknown): Request {
  return new Request("http://localhost/api/delivery/token", {
    method: "POST",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAdmin);
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
});

describe("POST /api/delivery/token — auth & validation", () => {
  it("401 when not admin (AuthError 401)", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Non autorisé.", 401));
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(401);
  });

  it("403 when role is not admin (AuthError 403)", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Accès refusé.", 403));
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(403);
  });

  it("429 when the per-IP rate limit is exhausted (pre-auth)", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(429);
  });

  it("400 on missing orderId", async () => {
    const res = await POST(tokenReq({}));
    expect(res.status).toBe(400);
  });

  it("400 on oversized orderId (> 200 chars)", async () => {
    const res = await POST(tokenReq({ orderId: "a".repeat(201) }));
    expect(res.status).toBe(400);
  });

  it("400 on malformed JSON body", async () => {
    const req = new Request("http://localhost/api/delivery/token", {
      method: "POST",
      headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

describe("POST /api/delivery/token — DB outcomes", () => {
  it("404 when the order does not exist", async () => {
    // First call (conditional UPDATE) returns []; second (status lookup) also [].
    const sql = makeSql([[], []]);
    getSqlMock.mockReturnValueOnce(sql);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(404);
  });

  it("409 when the order exists but is in a non-deliverable status", async () => {
    // UPDATE matches nothing -> []. Status lookup returns "Attente Acompte".
    const sql = makeSql([[], [{ status: "Attente Acompte" }]]);
    getSqlMock.mockReturnValueOnce(sql);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(409);
  });

  it("409 when the order is already 'Livré'", async () => {
    const sql = makeSql([[], [{ status: "Livré" }]]);
    getSqlMock.mockReturnValueOnce(sql);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(409);
  });

  it("200 happy path: returns a hex token, writes the SHA-256 hash + expiry", async () => {
    // UPDATE returns the row (status whitelist matched).
    const sql = makeSql([[{ id: "o1" }]]);
    getSqlMock.mockReturnValueOnce(sql);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(200);
    const data = (await res.json()) as { ok: boolean; token: string; expiresInMs: number };
    expect(data.ok).toBe(true);
    // 24 random bytes -> 48 hex chars; checked to catch a future "let's reduce
    // the entropy" change that would silently weaken the QR.
    expect(data.token).toMatch(/^[0-9a-f]{48}$/);
    expect(data.expiresInMs).toBe(30 * 60 * 1000);

    // The SQL must store the SHA-256 *hash* (not the token itself). Pin that
    // by asserting (a) the route never passed the raw token to SQL, (b) it
    // passed a 64-char hex string (sha256 hex).
    const updateCall = sql.calls[0];
    const passed = updateCall.values.map(String).join("|");
    expect(passed).not.toContain(data.token); // raw token must never hit the DB
    // First value passed is the hash; check it is 64-hex.
    const hash = updateCall.values[0] as string;
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    // Second value is the expiry (epoch ms in the near future).
    const exp = updateCall.values[1] as number;
    expect(typeof exp).toBe("number");
    expect(exp).toBeGreaterThan(Date.now());
  });

  it("500 when the DB throws", async () => {
    // Only the tagged-template path throws (function-call form for IN-list
    // expansion must still return synchronously, otherwise we leak an
    // unhandled rejection on the values array).
    const sql = ((...args: unknown[]): unknown => {
      if (Array.isArray(args[0]) && Object.prototype.hasOwnProperty.call(args[0], "raw")) {
        return Promise.reject(new Error("connection refused"));
      }
      return args[0];
    }) as unknown as ReturnType<typeof makeSql>;
    sql.calls = [];
    getSqlMock.mockReturnValueOnce(sql);
    const res = await POST(tokenReq({ orderId: "o1" }));
    expect(res.status).toBe(500);
  });
});
