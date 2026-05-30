import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { adminDb, adminAuth, verifyAppCheckToken } from "@/lib/firebase-admin";
import { clientIp } from "@/lib/utils";
import { MAINTENANCE_MODE } from "@/lib/maintenance";

vi.mock("@/lib/firebase-admin", () => {
  const getMock = vi.fn();
  const runTransactionMock = vi.fn();
  const docMock = vi.fn(() => ({
    get: getMock,
    id: "mock-id",
  }));
  const collectionMock = vi.fn(() => ({
    get: getMock,
    doc: docMock,
  }));

  const adminDb = {
    collection: collectionMock,
    runTransaction: runTransactionMock,
  };

  const adminAuth = {
    verifyIdToken: vi.fn(),
  };

  return {
    adminDb,
    adminAuth,
    verifyAppCheckToken: vi.fn(),
  };
});

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

describe("POST /api/reservation", () => {
  let mockRequest: Request;

  beforeEach(() => {
    vi.clearAllMocks();

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = futureDate.toISOString().slice(0, 10);

    const payload = {
      items: [{ id: "garba", quantity: 2 }],
      date: dateStr,
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: {
        firstName: "John",
        lastName: "Doe",
        phone: "0612345678",
      },
    };

    mockRequest = new Request("http://localhost/api/reservation", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": "Bearer mock-token",
        "X-Firebase-AppCheck": "mock-app-check",
      },
      body: JSON.stringify(payload),
    });

    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "mock-uid" });

    // Mock Firestore behavior
    const collectionMock = adminDb.collection as any;
    const mockSnap = {
      forEach: (cb: any) => {
        cb({ id: "garba", data: () => ({ price: 13 }) });
      },
      exists: false,
    };
    collectionMock.mockReturnValue({
      get: vi.fn().mockResolvedValue(mockSnap),
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
        id: "mock-id",
      }),
    });
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: true, data: () => ({}) }),
        set: vi.fn(),
        update: vi.fn(),
      };
      await cb(tx);
    });
    
    // For rate limit reset, we simulate different IPs
    (clientIp as any).mockReturnValue(`ip-${Date.now()}-${Math.random()}`);
  });

  it("should return 401 if Authorization header is missing", async () => {
    const req = new Request("http://localhost/api/reservation", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for empty cart", async () => {
    const req = new Request("http://localhost/api/reservation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer mock-token",
        "X-Firebase-AppCheck": "mock-app-check",
      },
      body: JSON.stringify({ items: [] }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Le panier est vide.");
  });

  it("should return 400 for invalid item ID", async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 2);
    const dateStr = futureDate.toISOString().slice(0, 10);

    const payload = {
      items: [{ id: "unknown-item", quantity: 1 }],
      date: dateStr,
      slot: "12h00 - 12h30",
      deliveryMode: "retrait",
      customer: {
        firstName: "John",
        lastName: "Doe",
        phone: "0612345678",
      },
    };

    const req = new Request("http://localhost/api/reservation", {
      method: "POST",
      headers: {
        "Authorization": "Bearer mock-token",
        "X-Firebase-AppCheck": "mock-app-check",
      },
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("Article inconnu");
  });

  it("should successfully process a valid request", async () => {
    const res = await POST(mockRequest);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reference).toMatch(/^AM-\d{8}-[A-Z0-9]{8}$/);
    expect(data.total).toBe(26); // 13 * 2
  });

  it("should return 429 for rate limit exceeded", async () => {
    (clientIp as any).mockReturnValue("same-ip");
    let res;
    // Send 11 requests
    for (let i = 0; i < 11; i++) {
      res = await POST(new Request("http://localhost/api/reservation", {
        method: "POST",
        headers: { "Authorization": "Bearer mock-token" },
        body: "{}"
      }));
    }
    expect(res?.status).toBe(429);
  });
});

describe("Rate Limiter IP Anti-Spoofing (Vague1-C hardened contract)", () => {
  it("trusts x-vercel-forwarded-for (set by Vercel's edge, not client-spoofable)", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-vercel-forwarded-for": "203.0.113.1",
        // Even if the client also sends a forged x-forwarded-for, the Vercel
        // edge header wins and the forged one is ignored.
        "x-forwarded-for": "1.1.1.1, 2.2.2.2",
      }),
    });
    expect(clientIp(req)).toBe("203.0.113.1");
  });

  it("does NOT trust client-supplied x-forwarded-for (would grant a fresh bucket per forged IP)", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-forwarded-for": "10.0.0.1, 192.168.1.1, 203.0.113.5",
      }),
    });
    // Hardened: without the trusted Vercel header, fall back to a single shared
    // sentinel rather than any spoofable value.
    expect(clientIp(req)).toBe("untrusted-proxy");
  });

  it("does NOT trust client-supplied x-real-ip", () => {
    const req = new Request("https://example.com", {
      headers: new Headers({
        "x-real-ip": "198.51.100.1",
      }),
    });
    expect(clientIp(req)).toBe("untrusted-proxy");
  });

  it("returns the shared sentinel when no trusted header is present", () => {
    const req = new Request("https://example.com");
    expect(clientIp(req)).toBe("untrusted-proxy");
  });
});
