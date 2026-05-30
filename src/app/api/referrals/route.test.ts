import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { adminDb, adminAuth } from "@/lib/firebase-admin";

vi.mock("@/lib/firebase-admin", () => {
  const getMock = vi.fn();
  const whereMock = vi.fn();
  const limitMock = vi.fn();
  
  const docMock = vi.fn(() => ({
    get: getMock,
    id: "mock-id",
  }));
  
  const queryChain = {
    where: whereMock,
    limit: limitMock,
    get: getMock,
  };
  
  whereMock.mockReturnValue(queryChain);
  limitMock.mockReturnValue(queryChain);

  const collectionMock = vi.fn(() => ({
    doc: docMock,
    where: whereMock,
  }));

  return {
    adminDb: {
      collection: collectionMock,
    },
    adminAuth: {
      verifyIdToken: vi.fn(),
    },
    verifyAppCheckToken: vi.fn(),
    adminUnavailableResponse: () => null,
  };
});

// Bypass the (fail-closed) rate limiter so its Firestore reads don't fight the
// adminDb mock. Tests don't exercise rate-limit logic itself.
vi.mock("@/lib/rate-limit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue(true),
}));

describe("GET /api/referrals", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 if Authorization header is missing", async () => {
    const req = new Request("http://localhost/api/referrals", { method: "GET" });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 401 if token is invalid", async () => {
    (adminAuth.verifyIdToken as any).mockRejectedValue(new Error("Invalid token"));
    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer invalid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("should return 404 if user is not found", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123" });
    const collectionMock = adminDb.collection as any;
    
    // First call to users collection to get user
    collectionMock.mockReturnValueOnce({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({ exists: false }),
      })
    });

    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(404);
  });

  it("should return referrals properly mapped and sorted", async () => {
    (adminAuth.verifyIdToken as any).mockResolvedValue({ uid: "user123" });
    const collectionMock = adminDb.collection as any;
    
    // First call: user document
    collectionMock.mockReturnValueOnce({
      doc: vi.fn().mockReturnValue({
        get: vi.fn().mockResolvedValue({
          exists: true,
          data: () => ({ referralCode: "REF123" })
        }),
      })
    });

    // Second call: referred query
    const mockReferredUsers = {
      docs: [
        {
          id: "friend1",
          data: () => ({ name: "Alice Dupont", ordersCount: 2, createdAt: new Date("2026-05-20T10:00:00Z") }),
        },
        {
          id: "friend2",
          data: () => ({ name: "Bob Martin", ordersCount: 0, createdAt: new Date("2026-05-25T10:00:00Z") }),
        }
      ]
    };
    
    const queryChain = {
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      get: vi.fn().mockResolvedValue(mockReferredUsers),
    };

    collectionMock.mockReturnValueOnce(queryChain);

    const req = new Request("http://localhost/api/referrals", {
      method: "GET",
      headers: { Authorization: "Bearer valid-token" },
    });
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    
    expect(data.referrals.length).toBe(2);
    // Vague3-J: names are masked to initials only ("A. D.") and the list is
    // sorted by hasContributed desc, then ordersCount desc — exact join
    // timestamps are no longer exposed client-side.
    expect(data.referrals[0].name).toBe("A. D.");
    expect(data.referrals[0].hasContributed).toBe(true);
    expect(data.referrals[0].joinedBucket).toBeTypeOf("string");

    expect(data.referrals[1].name).toBe("B. M.");
    expect(data.referrals[1].hasContributed).toBe(false);
    expect(data.referrals[1].joinedBucket).toBeTypeOf("string");
  });
});
