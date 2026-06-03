import { describe, it, expect, vi, beforeEach } from "vitest";

// ---------------------------------------------------------------------------
// Module mocks — these MUST be declared before the route is imported, since
// the route's `import` statements run at module-evaluation time.
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

// `withTransaction` is the only db helper the route uses; expose a fake
// `sql`-tagged template on the `tx` object that returns whatever fixture rows
// the current test has queued. The first tagged-call returns the order row,
// the second returns the settings row, subsequent calls (UPDATEs) return [].
vi.mock("@/lib/db", () => {
  return {
    withTransaction: vi.fn(),
    getSql: vi.fn(),
  };
});

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/utils")>();
  return {
    ...actual,
    clientIp: vi.fn(() => "127.0.0.1"),
  };
});

// ---------------------------------------------------------------------------
// Now import the route and the mocked modules.
// ---------------------------------------------------------------------------
import { POST } from "./route";
import { requireAuth, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { withTransaction } from "@/lib/db";
import { clientIp } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FakeRow = Record<string, unknown>;

/**
 * Build a fake `tx` whose tagged-template call returns rows from a queued
 * list, in order. Also records every call's update statements via a vi.fn
 * so we can assert side-effects.
 *
 * Postgres.js usage in the route is `await tx<RowT[]>\`...\``. The tag is
 * invoked as `tx(strings, ...values)`, so a plain function works.
 */
function makeTx(rowQueue: FakeRow[][]) {
  const calls: { strings: TemplateStringsArray; values: unknown[] }[] = [];
  const tx: any = vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ strings, values });
    const next = rowQueue.shift();
    return Promise.resolve(next ?? []);
  });
  tx.json = (v: unknown) => v;
  return { tx, calls };
}

function authedRequest(body: unknown): Request {
  return new Request("http://localhost/api/review", {
    method: "POST",
    headers: { Authorization: "Bearer valid-token" },
    body: JSON.stringify(body),
  });
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

describe("POST /api/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (checkRateLimit as any).mockResolvedValue(true);
    (clientIp as any).mockReturnValue(`ip-${Date.now()}-${Math.random()}`);
  });

  it("should return 401 if Authorization header is missing", async () => {
    (requireAuth as any).mockRejectedValue(new AuthError("Non autorisé.", 401));
    const req = new Request("http://localhost/api/review", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if token is invalid", async () => {
    (requireAuth as any).mockRejectedValue(new AuthError("Token invalide.", 401));
    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for missing or invalid parameters", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    const res = await POST(
      authedRequest({ orderId: "order1", reaction: "super" }),
    );
    expect(res.status).toBe(400);
  });

  it("should return 404 if order not found", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx } = makeTx([[]]); // empty SELECT → ORDER_NOT_FOUND
      return cb(tx);
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(404);
  });

  it("should return 403 if user is not the owner", async () => {
    (requireAuth as any).mockResolvedValue({ ...fakeClaims, email_verified: false });
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx } = makeTx([
        [
          {
            id: "order1",
            user_id: "other-user",
            user_email: "other@test.com",
            status: "Livré",
            has_reviewed: false,
          },
        ],
      ]);
      return cb(tx);
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(403);
  });

  it("should return 400 if order is not delivered", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx } = makeTx([
        [
          {
            id: "order1",
            user_id: fakeClaims.sub,
            user_email: fakeClaims.email,
            status: "En cours",
            has_reviewed: false,
          },
        ],
      ]);
      return cb(tx);
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(400);
  });

  it("should return 400 if already reviewed (idempotency)", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx } = makeTx([
        [
          {
            id: "order1",
            user_id: fakeClaims.sub,
            user_email: fakeClaims.email,
            status: "Livré",
            has_reviewed: true,
          },
        ],
      ]);
      return cb(tx);
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(400);
  });

  it("should return 200 and add credit if valid and reward is active", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);

    let capturedCalls: { strings: TemplateStringsArray; values: unknown[] }[] = [];
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx, calls } = makeTx([
        // SELECT order
        [
          {
            id: "order1",
            user_id: fakeClaims.sub,
            user_email: fakeClaims.email,
            status: "Livré",
            has_reviewed: false,
          },
        ],
        // SELECT settings
        [{ value: { isReviewRewardActive: true } }],
        // UPDATE orders → []
        [],
        // UPDATE users → []
        [],
      ]);
      const result = await cb(tx);
      capturedCalls = calls;
      return result;
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.creditsAdded).toBe(1);

    // 4 tagged-template calls: SELECT order, SELECT settings, UPDATE orders, UPDATE users.
    expect(capturedCalls.length).toBe(4);
  });

  it("should return 200 with no credit when the reward flag is disabled", async () => {
    (requireAuth as any).mockResolvedValue(fakeClaims);
    (withTransaction as any).mockImplementation(async (cb: any) => {
      const { tx } = makeTx([
        [
          {
            id: "order1",
            user_id: fakeClaims.sub,
            user_email: fakeClaims.email,
            status: "Livré",
            has_reviewed: false,
          },
        ],
        [{ value: { isReviewRewardActive: false } }],
        [],
      ]);
      return cb(tx);
    });

    const res = await POST(authedRequest({ orderId: "order1", reaction: "bon" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.creditsAdded).toBe(0);
  });

  it("should return 429 when the pre-auth IP rate limiter denies", async () => {
    // Override only the first call (the pre-auth IP guard) to deny.
    (checkRateLimit as any).mockResolvedValueOnce(false);
    const res = await POST(
      new Request("http://localhost/api/review", {
        method: "POST",
        headers: { Authorization: "Bearer mock-token" },
        body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
      }),
    );
    expect(res.status).toBe(429);
  });
});
