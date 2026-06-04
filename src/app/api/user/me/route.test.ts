import { describe, it, expect, vi, beforeEach } from "vitest";

const { revokeAllSessionsMock } = vi.hoisted(() => ({
  revokeAllSessionsMock: vi.fn().mockResolvedValue(undefined),
}));

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
    revokeAllSessions: revokeAllSessionsMock,
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

import { PATCH, DELETE } from "./route";
import { requireAuth, AuthError } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit-store";

type Call = { sql: string; values: unknown[] };

function makeSql(queue: unknown[][]) {
  const calls: Call[] = [];
  const sql = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ sql: strings.join(" "), values });
    return Promise.resolve(queue.shift() ?? []);
  }) as ((s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>) & { calls: Call[] };
  sql.calls = calls;
  return sql;
}

const USER_ROW = {
  id: "u1", email: "u@x.com", name: "U", phone: null, role: "customer",
  email_verified: true, referral_code: "AFRO-U-1", referral_credits: 0,
  has_used_welcome_offer: false, orders_count: 0, is_first_login: false,
  image: null, subscribe_newsletter: false,
};

const fakeUser = { sub: "u1", email: "u@x.com", email_verified: true, role: "customer" as const };

function patchReq(body: unknown): Request {
  return new Request("http://localhost/api/user/me", {
    method: "PATCH",
    headers: { Authorization: "Bearer t", "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  (requireAuth as ReturnType<typeof vi.fn>).mockResolvedValue(fakeUser);
  (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValue(true);
});

describe("PATCH /api/user/me — auth & validation", () => {
  it("401 when not authenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Token manquant.", 401));
    const res = await PATCH(patchReq({ name: "X" }));
    expect(res.status).toBe(401);
  });

  it("429 when rate-limited", async () => {
    (checkRateLimit as ReturnType<typeof vi.fn>).mockResolvedValueOnce(false);
    const res = await PATCH(patchReq({ name: "X" }));
    expect(res.status).toBe(429);
  });

  it("400 on non-string name", async () => {
    const res = await PATCH(patchReq({ name: 123 }));
    expect(res.status).toBe(400);
  });

  it("400 on empty name", async () => {
    const res = await PATCH(patchReq({ name: "   " }));
    expect(res.status).toBe(400);
  });

  it("400 on non-string/non-null phone", async () => {
    const res = await PATCH(patchReq({ phone: 42 }));
    expect(res.status).toBe(400);
  });

  it("400 on non-boolean subscribeNewsletter", async () => {
    const res = await PATCH(patchReq({ subscribeNewsletter: "yes" }));
    expect(res.status).toBe(400);
  });

  it("404 when the user row is gone", async () => {
    getSqlMock.mockReturnValueOnce(makeSql([[]]));
    const res = await PATCH(patchReq({ name: "X" }));
    expect(res.status).toBe(404);
  });
});

describe("PATCH /api/user/me — CASE WHEN clear-field semantics", () => {
  // The UPDATE template interpolates values in this order:
  //   [0]=name, [1]=phoneSent, [2]=phoneValue, [3]=imageSent, [4]=imageValue,
  //   [5]=subscribe, [6]=id
  it("clears phone when an empty string is sent (phoneSent=true, value=null)", async () => {
    const sql = makeSql([[USER_ROW]]);
    getSqlMock.mockReturnValueOnce(sql);
    await PATCH(patchReq({ phone: "" }));
    const update = sql.calls.find((c) => c.sql.includes("UPDATE users"))!;
    expect(update.values[1]).toBe(true); // phoneSent
    expect(update.values[2]).toBeNull(); // phoneValue → clears
  });

  it("leaves phone untouched when the key is absent (phoneSent=false)", async () => {
    const sql = makeSql([[USER_ROW]]);
    getSqlMock.mockReturnValueOnce(sql);
    await PATCH(patchReq({ name: "New" }));
    const update = sql.calls.find((c) => c.sql.includes("UPDATE users"))!;
    expect(update.values[1]).toBe(false); // phoneSent
  });

  it("sets a new phone value", async () => {
    const sql = makeSql([[USER_ROW]]);
    getSqlMock.mockReturnValueOnce(sql);
    await PATCH(patchReq({ phone: "0612345678" }));
    const update = sql.calls.find((c) => c.sql.includes("UPDATE users"))!;
    expect(update.values[1]).toBe(true);
    expect(update.values[2]).toBe("0612345678");
  });

  it("clears image when null is sent (imageSent=true, value=null)", async () => {
    const sql = makeSql([[USER_ROW]]);
    getSqlMock.mockReturnValueOnce(sql);
    await PATCH(patchReq({ image: null }));
    const update = sql.calls.find((c) => c.sql.includes("UPDATE users"))!;
    expect(update.values[3]).toBe(true); // imageSent
    expect(update.values[4]).toBeNull(); // imageValue → clears
  });

  it("returns ok + mapped user on success", async () => {
    getSqlMock.mockReturnValueOnce(makeSql([[USER_ROW]]));
    const res = await PATCH(patchReq({ name: "New Name" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.user.email).toBe("u@x.com");
    expect(data.user.referralCredits).toBe(0);
  });
});

describe("DELETE /api/user/me", () => {
  it("401 when not authenticated", async () => {
    (requireAuth as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new AuthError("Token manquant.", 401));
    const res = await DELETE(
      new Request("http://localhost/api/user/me", { method: "DELETE" }),
    );
    expect(res.status).toBe(401);
  });

  it("soft-deletes (role='deleted'), anonymises email, and revokes sessions", async () => {
    const sql = makeSql([[]]);
    getSqlMock.mockReturnValueOnce(sql);
    const res = await DELETE(
      new Request("http://localhost/api/user/me", {
        method: "DELETE",
        headers: { Authorization: "Bearer t" },
      }),
    );
    expect(res.status).toBe(200);
    const update = sql.calls.find((c) => c.sql.includes("UPDATE users"))!;
    expect(update.sql).toContain("role = 'deleted'");
    expect(update.sql).toContain("@deleted.local");
    expect(revokeAllSessionsMock).toHaveBeenCalledWith("u1");
  });
});
