import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mocks (hoisted before the route import).
// ---------------------------------------------------------------------------
vi.mock("@/lib/rate-limit-store", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/utils", () => ({
  clientIp: vi.fn(() => "203.0.113.7"),
}));

const { withTransactionMock, getSqlMock } = vi.hoisted(() => ({
  withTransactionMock: vi.fn(),
  getSqlMock: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  withTransaction: withTransactionMock,
  getSql: getSqlMock,
}));

vi.mock("@/lib/auth", () => ({
  createSession: vi.fn().mockResolvedValue({ rawToken: "raw", expiresAt: new Date(Date.now() + 1000) }),
  signAccessToken: vi.fn().mockResolvedValue("jwt"),
  generateReferralCode: vi.fn(() => "AFRO-X-123456"),
  SESSION_COOKIE: "afro_session",
  sessionCookieOptions: () => ({ httpOnly: true, secure: true, sameSite: "lax", path: "/" }),
}));

import { GET } from "./route";

// Recording tagged-template fake for the transaction.
type Call = { sql: string; values: unknown[] };
function makeTx(queue: unknown[][]) {
  const calls: Call[] = [];
  const tx = ((strings: TemplateStringsArray, ...values: unknown[]) => {
    calls.push({ sql: strings.join(" "), values });
    return Promise.resolve(queue.shift() ?? []);
  }) as ((s: TemplateStringsArray, ...v: unknown[]) => Promise<unknown>) & { calls: Call[] };
  tx.calls = calls;
  return tx;
}

const STATE = "state-token-abc";

function callbackReq(): Request {
  return new Request(
    `https://afromiaam.com/api/auth/oauth/google/callback?code=auth-code&state=${STATE}`,
    { headers: { cookie: `afro_oauth_state=${STATE}`, "user-agent": "vitest" } },
  );
}

function mockGoogleFetch(emailVerified: boolean, email = "victim@gmail.com") {
  globalThis.fetch = vi.fn(async (url: string | URL | Request) => {
    const u = String(url);
    if (u.includes("oauth2.googleapis.com/token")) {
      return new Response(JSON.stringify({ access_token: "ga" }), { status: 200 });
    }
    if (u.includes("openidconnect.googleapis.com/v1/userinfo")) {
      return new Response(
        JSON.stringify({ sub: "google-sub-1", email, email_verified: emailVerified, name: "Victim" }),
        { status: 200 },
      );
    }
    return new Response("{}", { status: 404 });
  }) as unknown as typeof fetch;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.GOOGLE_OAUTH_CLIENT_ID = "cid";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "csec";
  process.env.OAUTH_REDIRECT_BASE_URL = "https://afromiaam.com";
  getSqlMock.mockReturnValue(makeTx([[]]));
});

afterEach(() => {
  // @ts-expect-error restore
  delete globalThis.fetch;
});

describe("OAuth callback — account pre-hijacking guard", () => {
  it("nulls the pre-existing password + drops sessions when linking an UNVERIFIED local account", async () => {
    mockGoogleFetch(true); // Google says the email is verified

    // byEmail returns an EXISTING but UNVERIFIED local account (the attacker's
    // pre-registration row). The oauth_accounts lookup returns [].
    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([
        [], // a) oauth_accounts link → none
        [{ id: "victim-row", email: "victim@gmail.com", email_verified: false, role: "customer", name: "Victim", referral_code: "AFRO-V-1" }], // b) byEmail → unverified
        [], // update users set email_verified/password_hash
        [], // delete from sessions
        [], // insert oauth_accounts
      ]);
      return fn(tx);
    });

    const res = await GET(callbackReq());
    // Redirects to /mon-compte on success.
    expect(res.status).toBe(302);

    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    // The critical assertion: the password is invalidated so a pre-registration
    // attacker who set a password is evicted.
    expect(sqls).toContain("password_hash = null");
    expect(sqls).toContain("email_verified = true");
    expect(sqls.toLowerCase()).toContain("delete from sessions");
    // And the Google identity is linked.
    expect(sqls.toLowerCase()).toContain("insert into oauth_accounts");
  });

  it("refuses to link when Google has NOT verified the email", async () => {
    mockGoogleFetch(false); // Google says NOT verified

    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      const tx = makeTx([
        [], // oauth link none
        [{ id: "row", email: "victim@gmail.com", email_verified: false, role: "customer", name: "V", referral_code: "AFRO-V-1" }],
      ]);
      return fn(tx);
    });

    const res = await GET(callbackReq());
    // Failure path redirects to /login?error=verify_email_first
    expect(res.status).toBe(302);
    const location = res.headers.get("location") || "";
    expect(location).toContain("/login?error=");
  });

  it("does NOT touch the password when linking an already-VERIFIED local account", async () => {
    mockGoogleFetch(true);

    let tx: ReturnType<typeof makeTx> | null = null;
    withTransactionMock.mockImplementationOnce(async (fn: (t: unknown) => Promise<unknown>) => {
      tx = makeTx([
        [], // oauth link none
        [{ id: "row", email: "victim@gmail.com", email_verified: true, role: "customer", name: "V", referral_code: "AFRO-V-1" }], // already verified
        [], // insert oauth_accounts
      ]);
      return fn(tx);
    });

    const res = await GET(callbackReq());
    expect(res.status).toBe(302);
    const sqls = tx!.calls.map((c) => c.sql).join("\n");
    // No password reset for an already-verified account — only the link.
    expect(sqls).not.toContain("password_hash = null");
    expect(sqls.toLowerCase()).toContain("insert into oauth_accounts");
  });
});
