import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { clientIp } from "@/lib/utils";
import { checkRateLimit } from "@/lib/rate-limit-store";
import { requireAuth } from "@/lib/auth";
import { verifyRecaptcha } from "@/lib/recaptcha";
import { getSql, withTransaction } from "@/lib/db";

// ----- Mocks ---------------------------------------------------------------
// We mock the entire data + auth + captcha + rate-limit layer so the tests
// never hit a real DB and the route's business logic is exercised in isolation.

vi.mock("@/lib/auth", async () => {
  // We intentionally re-export AuthError + authErrorResponse so the route can
  // narrow on `instanceof AuthError`. They're tiny pure classes/functions, so
  // we re-implement them inline rather than pulling the real module (which
  // would still be safe — db isn't touched by import — but this keeps the
  // mock surface explicit).
  class AuthError extends Error {
    readonly status: number;
    constructor(message: string, status = 401) {
      super(message);
      this.name = "AuthError";
      this.status = status;
    }
  }
  function authErrorResponse(e: unknown): Response {
    if (e instanceof AuthError) {
      return Response.json({ error: e.message }, { status: e.status });
    }
    return Response.json({ error: "Non autorisé." }, { status: 401 });
  }
  return {
    AuthError,
    authErrorResponse,
    requireAuth: vi.fn(),
  };
});

vi.mock("@/lib/recaptcha", () => ({
  verifyRecaptcha: vi.fn().mockResolvedValue(true),
}));

// Bypass the rate limiter by default. Individual tests can override.
vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    clientIp: vi.fn(() => "127.0.0.1"),
  };
});

vi.mock("@/lib/maintenance", () => ({
  MAINTENANCE_MODE: false,
}));

vi.mock("@/lib/db", () => {
  const sqlMock = vi.fn();
  const withTransactionMock = vi.fn();
  return {
    getSql: vi.fn(() => sqlMock),
    withTransaction: withTransactionMock,
  };
});

// ----- Helpers -------------------------------------------------------------

function futureIsoDate(daysAhead = 2): string {
  // Use local-time components (matches what the reservation route does when
  // parsing the date), and prefer a weekday that is open in the default
  // schedule (Mon..Sat are open, Sunday is closed). If `daysAhead` lands on
  // Sunday we bump by one to land on Monday.
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  if (d.getDay() === 0) d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildRequest(body: unknown, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/reservation", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "Authorization": "Bearer mock-token",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

// Configure the `sql` mock to behave as a tagged-template function that
// returns rows based on the SQL text it sees. Used for menu prices + closures
// reads outside the transaction.
function installSqlMock(opts: {
  closures?: string[];
  menuPrices?: Array<{ id: string; price: number }>;
  // Overrides for the default permissive settings.global the mock returns.
  globalOverrides?: Partial<{
    leadTimeMin: number;
    slotDurationMin: number;
    isReviewRewardActive: boolean;
    isWelcomeOfferActive: boolean;
  }>;
  // When set, the pre-transaction idempotency lookup returns this row and
  // the route short-circuits to a replay response.
  existingIdempotentOrder?: {
    id: string;
    reference: string;
    subtotal: number;
    delivery_fee: number;
    total: number;
    deposit_amount: number;
  };
} = {}) {
  const sqlMock = getSql() as unknown as ReturnType<typeof vi.fn>;
  sqlMock.mockReset();
  sqlMock.mockImplementation((strings: TemplateStringsArray) => {
    const text = strings.join(" ");
    if (text.includes("FROM menu_items")) {
      return Promise.resolve(
        opts.menuPrices ?? [{ id: "garba", price: 13 }],
      );
    }
    // The route now reads BOTH 'global' (for schedule/leadTime/slotDuration)
    // and 'closures' (for blocked dates) in a single SELECT key IN (...).
    if (text.includes("FROM settings") && text.includes("'global'")) {
      const rows: Array<{ key: string; value: unknown }> = [
        // settings.global with leadTimeMin = 0 by default so tests don't have
        // to think about wall-clock lead time. Schedule: Mon..Sat open
        // 00:00..23:30 so the legacy fixture slot "12h00 - 12h30" remains
        // valid. Override per-test via opts.globalOverrides.
        {
          key: "global",
          value: {
            isReviewRewardActive: opts.globalOverrides?.isReviewRewardActive ?? true,
            isWelcomeOfferActive: opts.globalOverrides?.isWelcomeOfferActive ?? true,
            leadTimeMin: opts.globalOverrides?.leadTimeMin ?? 0,
            slotDurationMin: opts.globalOverrides?.slotDurationMin ?? 30,
            schedule: [
              { open: false, openHHMM: "00:00", closeHHMM: "23:30" }, // Sun
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Mon
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Tue
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Wed
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Thu
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Fri
              { open: true, openHHMM: "00:00", closeHHMM: "23:30" },  // Sat
            ],
          },
        },
      ];
      if (opts.closures !== undefined) {
        rows.push({ key: "closures", value: { blockedDates: opts.closures } });
      }
      return Promise.resolve(rows);
    }
    if (text.includes("FROM orders") && text.includes("idempotency_key")) {
      return Promise.resolve(
        opts.existingIdempotentOrder ? [opts.existingIdempotentOrder] : [],
      );
    }
    return Promise.resolve([]);
  });
}

// Configure the withTransaction mock to invoke the callback with a tx tag
// that returns user/promotion rows we control.
function installTransactionMock(opts: {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    referral_credits?: number;
    orders_count?: number;
    has_used_welcome_offer?: boolean;
    referred_by?: string | null;
  };
  promoCodes?: Record<string, { code: string; isActive: boolean; discountType: string; discountValue: number }>;
  insertedOrderId?: string;
} = {}): { statements: string[] } {
  const recorder = { statements: [] as string[] };
  const withTx = withTransaction as unknown as ReturnType<typeof vi.fn>;
  withTx.mockReset();
  withTx.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
    const tx: any = (strings: TemplateStringsArray) => {
      const text = strings.join(" ");
      recorder.statements.push(text);
      if (text.includes("FROM users") && text.includes("FOR UPDATE")) {
        return Promise.resolve([
          {
            id: opts.user?.id ?? "mock-uid",
            name: opts.user?.name ?? null,
            email: opts.user?.email ?? null,
            referral_credits: opts.user?.referral_credits ?? 0,
            orders_count: opts.user?.orders_count ?? 0,
            has_used_welcome_offer: opts.user?.has_used_welcome_offer ?? false,
            referred_by: opts.user?.referred_by ?? null,
          },
        ]);
      }
      if (text.includes("FROM settings") && text.includes("'promotions'")) {
        return Promise.resolve([
          { value: { codes: opts.promoCodes ?? {} } },
        ]);
      }
      if (text.includes("FROM users") && text.includes("referral_code")) {
        return Promise.resolve([]);
      }
      if (text.includes("INSERT INTO orders")) {
        return Promise.resolve([
          { id: opts.insertedOrderId ?? "mock-order-id" },
        ]);
      }
      if (text.startsWith(" UPDATE users") || text.includes("UPDATE users")) {
        return Promise.resolve([]);
      }
      return Promise.resolve([]);
    };
    tx.json = (v: unknown) => v;
    return cb(tx);
  });
  return recorder;
}

// ----- Tests ---------------------------------------------------------------

describe("POST /api/reservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mocks happy-path.
    (requireAuth as any).mockResolvedValue({
      sub: "mock-uid",
      email: "user@example.com",
      email_verified: true,
      role: "customer",
    });
    (verifyRecaptcha as any).mockResolvedValue(true);
    (checkRateLimit as any).mockResolvedValue(true);
    (clientIp as any).mockReturnValue(`ip-${Date.now()}-${Math.random()}`);
    installSqlMock();
    installTransactionMock();
  });

  it("should return 401 if Authorization header is missing", async () => {
    (requireAuth as any).mockImplementationOnce(async () => {
      const { AuthError } = await import("@/lib/auth");
      throw new AuthError("Non autorisé.", 401);
    });

    const req = new Request("http://localhost/api/reservation", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 503 when MAINTENANCE_MODE is enabled", async () => {
    // Use doMock + dynamic re-import so we can flip the module's exported
    // constant for just this case without polluting subsequent tests.
    vi.resetModules();
    vi.doMock("@/lib/maintenance", () => ({ MAINTENANCE_MODE: true }));
    vi.doMock("@/lib/auth", async () => {
      const real = await vi.importActual<typeof import("@/lib/auth")>(
        "@/lib/auth",
      );
      return { ...real, requireAuth: vi.fn() };
    });
    vi.doMock("@/lib/recaptcha", () => ({
      verifyRecaptcha: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/rate-limit-store", () => ({
      checkRateLimit: vi.fn().mockResolvedValue(true),
    }));
    vi.doMock("@/lib/db", () => ({
      getSql: vi.fn(() => vi.fn().mockResolvedValue([])),
      withTransaction: vi.fn(),
    }));

    const mod = await import("./route");
    const req = buildRequest({ items: [] });
    const res = await mod.POST(req);
    expect(res.status).toBe(503);

    // Restore for the other tests in this file.
    vi.doUnmock("@/lib/maintenance");
    vi.resetModules();
  });

  it("should return 400 for empty cart", async () => {
    const req = buildRequest({ items: [] });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Le panier est vide.");
  });

  it("should return 400 for an invalid date format", async () => {
    const req = buildRequest({
      items: [{ id: "garba", quantity: 1 }],
      date: "not-a-date",
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Date invalide.");
  });

  it("rejects a slot that is outside the schedule window", async () => {
    // The mock schedule opens 00:00..23:30. A slot ending at 24h is outside.
    installSqlMock(); // default permissive
    installTransactionMock();
    const req = buildRequest({
      items: [{ id: "garba", quantity: 1 }],
      date: futureIsoDate(),
      slot: "23h30 - 24h00",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    // Accept any of the schedule-related rejections — the precise reason
    // depends on the parser's analysis of the malformed slot.
    expect(data.error).toMatch(/Créneau|hors des heures/i);
  });

  it("enforces the admin-configurable lead time (rejects too-close slots)", async () => {
    // Today, ~1 minute from now, with leadTimeMin = 240 → must be rejected.
    // Force every day open in the mock (the default mock closes Sunday) so
    // this test is independent of which day of the week the suite runs on.
    const now = new Date();
    const oneMinFromNow = new Date(now.getTime() + 60_000);
    const hh = oneMinFromNow.getHours();
    const mm = oneMinFromNow.getMinutes();
    const alignedMin = Math.floor((hh * 60 + mm) / 30) * 30;
    const start = `${String(Math.floor(alignedMin / 60)).padStart(2, "0")}h${String(alignedMin % 60).padStart(2, "0")}`;
    const endMin = alignedMin + 30;
    const end = `${String(Math.floor(endMin / 60)).padStart(2, "0")}h${String(endMin % 60).padStart(2, "0")}`;
    // Patch the mock to force every day open AND set leadTimeMin=240.
    const sqlMock = getSql() as unknown as ReturnType<typeof vi.fn>;
    sqlMock.mockReset();
    sqlMock.mockImplementation((strings: TemplateStringsArray) => {
      const text = strings.join(" ");
      if (text.includes("FROM menu_items")) return Promise.resolve([{ id: "garba", price: 13 }]);
      if (text.includes("FROM settings") && text.includes("'global'")) {
        return Promise.resolve([
          {
            key: "global",
            value: {
              isReviewRewardActive: true,
              isWelcomeOfferActive: true,
              leadTimeMin: 240,
              slotDurationMin: 30,
              schedule: Array.from({ length: 7 }, () => ({
                open: true,
                openHHMM: "00:00",
                closeHHMM: "23:30",
              })),
            },
          },
        ]);
      }
      return Promise.resolve([]);
    });
    installTransactionMock();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const req = buildRequest({
      items: [{ id: "garba", quantity: 1 }],
      date: today,
      slot: `${start} - ${end}`,
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/trop proche|au moins|hors des heures/i);
  });

  it("should return 400 for unknown menu item id", async () => {
    const req = buildRequest({
      items: [{ id: "unknown-item", quantity: 1 }],
      date: futureIsoDate(),
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Article inconnu");
  });

  it("should reject when discounts fully cover the order (total must be positive)", async () => {
    // Welcome (-5) + 100% promo on the remaining 21 -> finalTotal === 0.
    installTransactionMock({
      user: { orders_count: 0, has_used_welcome_offer: false },
      promoCodes: {
        FREE: { code: "FREE", isActive: true, discountType: "percentage", discountValue: 100 },
      },
    });

    const req = buildRequest({
      items: [{ id: "garba", quantity: 2 }],
      date: futureIsoDate(),
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      promoCode: "FREE",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("réductions couvrent");
  });

  it("should return 429 when the rate limiter denies", async () => {
    // First call (IP rate limit) returns false -> 429 BEFORE auth.
    (checkRateLimit as any).mockResolvedValueOnce(false);
    const res = await POST(
      buildRequest({}, { Authorization: "Bearer mock-token" }),
    );
    expect(res.status).toBe(429);
  });

  it("should successfully process a valid request and apply the welcome offer", async () => {
    const req = buildRequest({
      items: [{ id: "garba", quantity: 2 }],
      date: futureIsoDate(),
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reference).toMatch(/^AM-\d{8}-[A-Z0-9]{8}$/);
    // 13 * 2 = 26 subtotal, minus the 5€ first-order welcome offer the route
    // auto-applies when the user has orders_count===0 && !has_used_welcome_offer
    // (the fixture user has both conditions true by default).
    expect(data.total).toBe(21);
    expect(data.depositAmount).toBe(10.5); // 50% of 21
  });

  it("does NOT increment orders_count at creation (loyalty counts on delivery only)", async () => {
    // Regression guard: orders_count must be incremented exactly once, on the
    // -> 'Livré' transition. Incrementing it here too double-counted every
    // completed order on the member card.
    installSqlMock();
    const recorder = installTransactionMock();
    const res = await POST(
      buildRequest({
        items: [{ id: "garba", quantity: 2 }],
        date: futureIsoDate(),
        slot: "12h00 - 12h30",
        deliveryMode: "retrait",
        customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
      }),
    );
    expect(res.status).toBe(200);
    const userUpdate = recorder.statements.find(
      (s) => s.includes("UPDATE users") && s.includes("has_used_welcome_offer"),
    );
    expect(userUpdate).toBeDefined();
    expect(userUpdate).not.toContain("orders_count = orders_count + 1");
  });

  it("attaches the referrer on the first order of a SIGNUP-referred user", async () => {
    // Regression guard: a customer who entered a referral code at SIGNUP has
    // users.referred_by already set. The referrer reward must still be wired
    // onto their first order (it was previously gated on referred_by IS NULL,
    // which silently dropped the reward for every signup-referred customer).
    installSqlMock();
    const recorder = installTransactionMock({
      user: { referred_by: "referrer-uid", orders_count: 0 },
    });
    const res = await POST(
      buildRequest({
        items: [{ id: "garba", quantity: 1 }],
        date: futureIsoDate(),
        slot: "12h00 - 12h30",
        deliveryMode: "retrait",
        customer: { firstName: "Fil", lastName: "Leul", phone: "0612345678" },
      }),
    );
    expect(res.status).toBe(200);
    // The new code path resolves the referrer from referred_by and then checks
    // for a prior referral-bearing order — that "prior order" probe only runs
    // when a candidate referrer exists, so its presence proves the reward is
    // being wired for a signup-referred user.
    const priorProbe = recorder.statements.find(
      (s) => s.includes("FROM orders") && s.includes("referrer_id IS NOT NULL"),
    );
    expect(priorProbe).toBeDefined();
  });

  describe("idempotency (Idempotency-Key header)", () => {
    it("replays an existing order when the same key has already been used", async () => {
      installSqlMock({
        existingIdempotentOrder: {
          id: "existing-order-uuid",
          reference: "AM-20260101-AAAAAAAA",
          subtotal: 26,
          delivery_fee: 0,
          total: 21,
          deposit_amount: 10.5,
        },
      });
      installTransactionMock();

      const req = buildRequest(
        {
          items: [{ id: "garba", quantity: 2 }],
          date: futureIsoDate(),
          slot: "12h00 - 12h30",
          deliveryMode: "retrait",
          customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
        },
        { "Idempotency-Key": "replay-key-123" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.replayed).toBe(true);
      expect(data.orderId).toBe("existing-order-uuid");
      expect(data.reference).toBe("AM-20260101-AAAAAAAA");
      expect(data.total).toBe(21);
      // The transaction must NOT run when we replay — no second insert.
      expect((withTransaction as any)).not.toHaveBeenCalled();
    });

    it("proceeds normally when the header is absent (no replay)", async () => {
      installSqlMock();
      installTransactionMock();
      const req = buildRequest({
        items: [{ id: "garba", quantity: 2 }],
        date: futureIsoDate(),
        slot: "12h00 - 12h30",
        deliveryMode: "retrait",
        customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
      expect(data.replayed).toBeUndefined();
      expect((withTransaction as any)).toHaveBeenCalled();
    });

    it("proceeds normally when the header is fresh (no prior order)", async () => {
      installSqlMock(); // existingIdempotentOrder omitted -> [] from lookup
      installTransactionMock();
      const req = buildRequest(
        {
          items: [{ id: "garba", quantity: 2 }],
          date: futureIsoDate(),
          slot: "12h00 - 12h30",
          deliveryMode: "retrait",
          customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
        },
        { "Idempotency-Key": "fresh-unique-key" },
      );
      const res = await POST(req);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.replayed).toBeUndefined();
      expect((withTransaction as any)).toHaveBeenCalled();
    });
  });
});

// NB: the clientIp anti-spoofing suite lives in
// src/lib/utils.clientIp.test.ts so it can use the REAL clientIp
// (this file mocks @/lib/utils for the route POST tests).
