import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { adminDb, adminAuth } from "@/lib/firebase-admin";
import { clientIp } from "@/lib/utils";

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
  };
});

vi.mock("@/lib/utils", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...(actual as any),
    clientIp: vi.fn(() => "127.0.0.1"),
  };
});

describe("POST /api/review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (clientIp as any).mockReturnValue(`ip-${Date.now()}-${Math.random()}`);
  });

  it("should return 401 if Authorization header is missing", async () => {
    const req = new Request("http://localhost/api/review", { method: "POST" });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if token is invalid", async () => {
    (adminAuth.verifyIdToken as any).mockRejectedValue(new Error("Invalid token"));
    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it("should return 400 for missing or invalid parameters", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "super" }), // invalid reaction
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 404 if order not found", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({ exists: false }),
      };
      await cb(tx);
    });

    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(404);
  });

  it("should return 403 if user is not the owner", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: "otherUser", userEmail: "other@test.com", status: "Livré" }),
        }),
      };
      await cb(tx);
    });

    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it("should return 400 if order is not delivered", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: "user123", userEmail: "test@test.com", status: "En cours" }),
        }),
      };
      await cb(tx);
    });

    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 400 if already reviewed", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ userId: "user123", userEmail: "test@test.com", status: "Livré", hasReviewed: true }),
        }),
      };
      await cb(tx);
    });

    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("should return 200 and add credit if valid and reward is active", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123", email: "test@test.com" });
    
    (adminDb.runTransaction as any).mockImplementation(async (cb: any) => {
      const tx = {
        get: vi.fn((ref) => {
           if (ref.id === "order1") {
             return Promise.resolve({
               exists: true,
               data: () => ({ userId: "user123", userEmail: "test@test.com", status: "Livré" }),
             });
           }
           if (ref.id === "global") {
             return Promise.resolve({
               exists: true,
               data: () => ({ isReviewRewardActive: true }),
             });
           }
           return Promise.resolve({ exists: false });
        }),
        update: vi.fn(),
      };
      await cb(tx);
    });

    const req = new Request("http://localhost/api/review", {
      method: "POST",
      headers: { Authorization: "Bearer valid-token" },
      body: JSON.stringify({ orderId: "order1", reaction: "bon" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.creditsAdded).toBe(1);
  });

  it("should return 429 for rate limit exceeded", async () => {
    (clientIp as any).mockReturnValue("same-ip");
    let res;
    // Send 16 requests
    for (let i = 0; i < 16; i++) {
      res = await POST(new Request("http://localhost/api/review", {
        method: "POST",
        headers: { "Authorization": "Bearer mock-token" },
        body: JSON.stringify({ orderId: "order1", reaction: "bon" })
      }));
    }
    expect(res?.status).toBe(429);
  });
});
