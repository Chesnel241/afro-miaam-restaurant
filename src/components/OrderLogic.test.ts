import { describe, it, expect } from "vitest";
import { docToOrder } from "./order-logic";

// Minimal stand-in for Firestore's Timestamp — only the toDate() method is
// used by the mapper. Avoids a hard dependency on firebase from tests.
class FakeTimestamp {
  constructor(private readonly date: Date) {}
  toDate(): Date {
    return this.date;
  }
}

describe("OrderContext - docToOrder", () => {
  it("should map fields correctly from basic data", () => {
    const data = {
      userId: "user1",
      userName: "Alice",
      userEmail: "alice@test.com",
      items: [{ name: "Garba", quantity: 2, price: 10 }],
      total: 20,
      status: "En attente",
      createdAt: "2026-05-26T12:00:00.000Z",
    };

    const order = docToOrder("order1", data);
    
    expect(order.id).toBe("order1");
    expect(order.userId).toBe("user1");
    expect(order.items.length).toBe(1);
    expect(order.total).toBe(20);
    expect(order.status).toBe("En attente");
    expect(order.createdAt).toBe("2026-05-26T12:00:00.000Z");
  });

  it("should handle Firestore Timestamp conversion", () => {
    const data = {
      createdAt: new FakeTimestamp(new Date("2026-05-27T10:00:00.000Z")),
    };

    const order = docToOrder("order2", data);
    expect(order.createdAt).toBe("2026-05-27T10:00:00.000Z");
  });

  it("should handle JS Date conversion", () => {
    const data = {
      createdAt: new Date("2026-05-28T10:00:00.000Z"),
    };

    const order = docToOrder("order3", data);
    expect(order.createdAt).toBe("2026-05-28T10:00:00.000Z");
  });

  it("should fallback to default values for missing fields", () => {
    const data = {};

    const order = docToOrder("order4", data);
    expect(order.id).toBe("order4");
    expect(order.userId).toBe("");
    expect(order.userName).toBe("");
    expect(order.total).toBe(0);
    expect(order.status).toBe("En attente");
    expect(order.hasReviewed).toBe(false);
    expect(typeof order.createdAt).toBe("string"); // Current date
  });
});
