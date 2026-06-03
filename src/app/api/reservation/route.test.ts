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
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d.toISOString().slice(0, 10);
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
    if (text.includes("FROM settings") && text.includes("'closures'")) {
      return Promise.resolve(
        opts.closures !== undefined
          ? [{ value: { blockedDates: opts.closures } }]
          : [],
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
} = {}) {
  const withTx = withTransaction as unknown as ReturnType<typeof vi.fn>;
  withTx.mockReset();
  withTx.mockImplementation(async (cb: (tx: any) => Promise<unknown>) => {
    const tx: any = (strings: TemplateStringsArray) => {
      const text = strings.join(" ");
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

  it("should return 400 for a slot not in ALLOWED_SLOTS", async () => {
    const req = buildRequest({
      items: [{ id: "garba", quantity: 1 }],
      date: futureIsoDate(),
      slot: "23h00 - 23h30",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Créneau non autorisé.");
  });

  it("should enforce the 24h advance rule", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const req = buildRequest({
      items: [{ id: "garba", quantity: 1 }],
      date: today,
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: { firstName: "John", lastName: "Doe", phone: "0612345678" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Réservation minimum 24h à l'avance.");
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
});

// NB: the clientIp anti-spoofing suite lives in
// src/lib/utils.clientIp.test.ts so it can use the REAL clientIp
// (this file mocks @/lib/utils for the route POST tests).
