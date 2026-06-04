import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

const { getSqlMock } = vi.hoisted(() => ({ getSqlMock: vi.fn() }));
vi.mock("@/lib/db", () => ({ getSql: getSqlMock }));

import { GET, PATCH } from "./route";
import { requireAdmin, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

// Tagged-template fake that returns the next queued result.
function makeSql(queue: unknown[][]) {
  const sql = ((_s: TemplateStringsArray, ..._v: unknown[]) =>
    Promise.resolve(queue.shift() ?? [])) as ((
    s: TemplateStringsArray,
    ...v: unknown[]
  ) => Promise<unknown>) & { json: (v: unknown) => unknown };
  sql.json = (v: unknown) => v;
  return sql;
}

const fakeAdmin = { sub: "admin-1", email: "a@x.com", email_verified: true, role: "admin" as const };

function patchReq(key: string, body: unknown): Request {
  return new Request(`http://localhost/api/admin/settings/${key}`, {
    method: "PATCH",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
function getReq(key: string): Request {
  return new Request(`http://localhost/api/admin/settings/${key}`, {
    method: "GET",
    headers: { Authorization: "Bearer t" },
  });
}
const ctx = (key: string) => ({ params: Promise.resolve({ key }) });

beforeEach(() => {
  vi.clearAllMocks();
  (requireAdmin as ReturnType<typeof vi.fn>).mockResolvedValue(fakeAdmin);
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
});

describe("GET /api/admin/settings/[key]", () => {
  it("401 when not admin", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Non autorisé.", 401));
    const res = await GET(getReq("global"), ctx("global"));
    expect(res.status).toBe(401);
  });

  it("400 on unknown key", async () => {
    const res = await GET(getReq("evil"), ctx("evil"));
    expect(res.status).toBe(400);
  });

  it("returns value:null when no row exists", async () => {
    getSqlMock.mockReturnValueOnce(makeSql([[]]));
    const res = await GET(getReq("promotions"), ctx("promotions"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.value).toBeNull();
  });

  it("returns the stored value when present", async () => {
    getSqlMock.mockReturnValueOnce(makeSql([[{ value: { blockedDates: ["2026-12-25"] } }]]));
    const res = await GET(getReq("closures"), ctx("closures"));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.value).toEqual({ blockedDates: ["2026-12-25"] });
  });
});

describe("PATCH — auth, key, size", () => {
  it("403 when role is not admin", async () => {
    (requireAdmin as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Accès refusé.", 403));
    const res = await PATCH(patchReq("global", {}), ctx("global"));
    expect(res.status).toBe(403);
  });

  it("400 on unknown key", async () => {
    const res = await PATCH(patchReq("evil", {}), ctx("evil"));
    expect(res.status).toBe(400);
  });
});

describe("PATCH validateGlobal", () => {
  it("rejects missing flags", async () => {
    const res = await PATCH(patchReq("global", { isReviewRewardActive: true }), ctx("global"));
    expect(res.status).toBe(400);
  });
  it("rejects non-boolean flag", async () => {
    const res = await PATCH(
      patchReq("global", { isReviewRewardActive: true, isWelcomeOfferActive: "yes" }),
      ctx("global"),
    );
    expect(res.status).toBe(400);
  });
  it("accepts valid global and returns the value", async () => {
    getSqlMock.mockReturnValueOnce(
      makeSql([[{ value: { isReviewRewardActive: true, isWelcomeOfferActive: false } }]]),
    );
    const res = await PATCH(
      patchReq("global", { isReviewRewardActive: true, isWelcomeOfferActive: false }),
      ctx("global"),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.value.isWelcomeOfferActive).toBe(false);
  });
});

describe("PATCH validatePromotions", () => {
  it("rejects body without codes", async () => {
    const res = await PATCH(patchReq("promotions", {}), ctx("promotions"));
    expect(res.status).toBe(400);
  });
  it("rejects entry with bad discountType", async () => {
    const body = { codes: { XMAS: { code: "XMAS", isActive: true, discountType: "bogus", discountValue: 10 } } };
    const res = await PATCH(patchReq("promotions", body), ctx("promotions"));
    expect(res.status).toBe(400);
  });
  it("rejects entry with non-number discountValue", async () => {
    const body = { codes: { XMAS: { code: "XMAS", isActive: true, discountType: "fixed", discountValue: "10" } } };
    const res = await PATCH(patchReq("promotions", body), ctx("promotions"));
    expect(res.status).toBe(400);
  });
  it("accepts a valid percentage code", async () => {
    const body = { codes: { XMAS: { code: "XMAS", isActive: true, discountType: "percentage", discountValue: 15 } } };
    getSqlMock.mockReturnValueOnce(makeSql([[{ value: body }]]));
    const res = await PATCH(patchReq("promotions", body), ctx("promotions"));
    expect(res.status).toBe(200);
  });
});

describe("PATCH validateClosures", () => {
  it("rejects non-array blockedDates", async () => {
    const res = await PATCH(patchReq("closures", { blockedDates: "2026-01-01" }), ctx("closures"));
    expect(res.status).toBe(400);
  });
  it("rejects a malformed date", async () => {
    const res = await PATCH(patchReq("closures", { blockedDates: ["2026-13-45"] }), ctx("closures"));
    expect(res.status).toBe(400);
  });
  it("accepts valid ISO dates", async () => {
    const body = { blockedDates: ["2026-12-25", "2027-01-01"] };
    getSqlMock.mockReturnValueOnce(makeSql([[{ value: body }]]));
    const res = await PATCH(patchReq("closures", body), ctx("closures"));
    expect(res.status).toBe(200);
  });
});
