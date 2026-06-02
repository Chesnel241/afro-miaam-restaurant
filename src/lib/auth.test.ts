import { beforeAll, describe, expect, it } from "vitest";
import {
  AuthError,
  generateReferralCode,
  getBearerToken,
  hashPassword,
  requireAdmin,
  requireAuth,
  signAccessToken,
  verifyAccessToken,
  verifyPassword,
  type Role,
} from "@/lib/auth";

// These tests deliberately exercise ONLY the DB-free surface of the auth module
// (JWT round-trips, password hashing, referral-code formatting, bearer-token
// parsing, request guards). Session / token-table functions need a live
// Postgres and are covered by integration tests elsewhere.

// AUTH_JWT_SECRET is read lazily (at call time), so setting it here in
// beforeAll is sufficient for every sign/verify call below.
beforeAll(() => {
  process.env.AUTH_JWT_SECRET = "test-secret-do-not-use-in-prod-0123456789";
});

const sampleUser = {
  id: "user-123",
  email: "diner@example.com",
  email_verified: true,
  role: "customer" as Role,
};

function bearerRequest(token: string | null): Request {
  const headers = new Headers();
  if (token !== null) headers.set("Authorization", token);
  return new Request("https://afro-miaam.example/api/x", { headers });
}

describe("access tokens (jose HS256)", () => {
  it("round-trips sign -> verify with all claims intact", async () => {
    const token = await signAccessToken(sampleUser);
    const claims = await verifyAccessToken(token);
    expect(claims.sub).toBe(sampleUser.id);
    expect(claims.email).toBe(sampleUser.email);
    expect(claims.email_verified).toBe(true);
    expect(claims.role).toBe("customer");
  });

  it("preserves the admin role through verification", async () => {
    const token = await signAccessToken({ ...sampleUser, role: "admin" });
    const claims = await verifyAccessToken(token);
    expect(claims.role).toBe("admin");
  });

  it("rejects a tampered token (bad signature)", async () => {
    const token = await signAccessToken(sampleUser);
    // Flip a character in the signature segment.
    const parts = token.split(".");
    const lastChar = parts[2].at(-1) === "a" ? "b" : "a";
    parts[2] = parts[2].slice(0, -1) + lastChar;
    const tampered = parts.join(".");
    await expect(verifyAccessToken(tampered)).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects a garbage / non-JWT token", async () => {
    await expect(verifyAccessToken("not-a-jwt")).rejects.toBeInstanceOf(
      AuthError,
    );
  });

  it("rejects a token signed with the wrong secret", async () => {
    const goodSecret = process.env.AUTH_JWT_SECRET;
    process.env.AUTH_JWT_SECRET = "a-totally-different-secret-value-9876543210";
    const tokenFromOtherIssuer = await signAccessToken(sampleUser);
    process.env.AUTH_JWT_SECRET = goodSecret;
    await expect(
      verifyAccessToken(tokenFromOtherIssuer),
    ).rejects.toBeInstanceOf(AuthError);
  });

  it("rejects an expired token", async () => {
    // Build an already-expired token by signing with jose directly so we don't
    // depend on real time passing. We reuse the same secret/issuer contract.
    const { SignJWT } = await import("jose");
    const secret = new TextEncoder().encode(process.env.AUTH_JWT_SECRET);
    const expired = await new SignJWT({
      email: sampleUser.email,
      email_verified: true,
      role: "customer",
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(sampleUser.id)
      .setIssuer("afro-miaam")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(secret);
    await expect(verifyAccessToken(expired)).rejects.toBeInstanceOf(AuthError);
  });
});

describe("password hashing (bcryptjs)", () => {
  it("hashes and verifies a correct password", async () => {
    const hash = await hashPassword("S3cur3-P@ssw0rd");
    expect(hash).not.toBe("S3cur3-P@ssw0rd");
    expect(hash.length).toBeGreaterThan(0);
    expect(await verifyPassword("S3cur3-P@ssw0rd", hash)).toBe(true);
  });

  it("rejects an incorrect password", async () => {
    const hash = await hashPassword("correct-horse");
    expect(await verifyPassword("wrong-horse", hash)).toBe(false);
  });

  it("returns false for an empty hash rather than throwing", async () => {
    expect(await verifyPassword("anything", "")).toBe(false);
  });
});

describe("generateReferralCode", () => {
  it("produces the AFRO-<NAME>-<6 random> format", () => {
    const code = generateReferralCode("Marie");
    expect(code).toMatch(/^AFRO-MARIE-[A-Z0-9]{6}$/);
  });

  it("truncates the name part to 6 alnum uppercase chars", () => {
    const code = generateReferralCode("Jean-Baptiste");
    // "JEANBAPTISTE" sanitized -> first 6 -> "JEANBA"
    expect(code).toMatch(/^AFRO-JEANBA-[A-Z0-9]{6}$/);
  });

  it("strips non-alphanumeric characters from the name", () => {
    const code = generateReferralCode("é!@#l odie");
    // accents/symbols/spaces removed -> "LODIE"
    expect(code).toMatch(/^AFRO-LODIE-[A-Z0-9]{6}$/);
  });

  it("falls back to a default name part when name is empty", () => {
    const code = generateReferralCode("");
    expect(code).toMatch(/^AFRO-MEMBER-[A-Z0-9]{6}$/);
  });

  it("is randomized across calls (suffix differs)", () => {
    const a = generateReferralCode("Sam");
    const b = generateReferralCode("Sam");
    expect(a).not.toBe(b);
  });
});

describe("getBearerToken", () => {
  it("extracts the token from a well-formed header", () => {
    expect(getBearerToken(bearerRequest("Bearer abc.def.ghi"))).toBe(
      "abc.def.ghi",
    );
  });

  it("returns null when the Authorization header is absent", () => {
    expect(getBearerToken(bearerRequest(null))).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(getBearerToken(bearerRequest("Basic dXNlcjpwYXNz"))).toBeNull();
  });

  it("returns null for a Bearer header with an empty token", () => {
    expect(getBearerToken(bearerRequest("Bearer    "))).toBeNull();
  });
});

describe("requireAuth", () => {
  it("returns claims for a valid bearer token", async () => {
    const token = await signAccessToken(sampleUser);
    const claims = await requireAuth(bearerRequest(`Bearer ${token}`));
    expect(claims.sub).toBe(sampleUser.id);
  });

  it("throws AuthError 401 when the header is missing", async () => {
    await expect(requireAuth(bearerRequest(null))).rejects.toMatchObject({
      status: 401,
    });
  });

  it("throws AuthError 401 for an invalid token", async () => {
    await expect(
      requireAuth(bearerRequest("Bearer garbage")),
    ).rejects.toBeInstanceOf(AuthError);
  });
});

describe("requireAdmin", () => {
  it("returns claims for an admin token", async () => {
    const token = await signAccessToken({ ...sampleUser, role: "admin" });
    const claims = await requireAdmin(bearerRequest(`Bearer ${token}`));
    expect(claims.role).toBe("admin");
  });

  it("throws AuthError 403 for a non-admin (customer) token", async () => {
    const token = await signAccessToken(sampleUser);
    await expect(
      requireAdmin(bearerRequest(`Bearer ${token}`)),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("throws AuthError 401 when unauthenticated", async () => {
    await expect(requireAdmin(bearerRequest(null))).rejects.toMatchObject({
      status: 401,
    });
  });
});
