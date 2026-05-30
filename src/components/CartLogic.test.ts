import { describe, it, expect } from "vitest";
import { sanitizeStoredLines } from "./cart-logic";

describe("CartContext - sanitizeStoredLines", () => {
  it("should return an empty array if input is not an array", () => {
    expect(sanitizeStoredLines(null)).toEqual([]);
    expect(sanitizeStoredLines({})).toEqual([]);
    expect(sanitizeStoredLines("string")).toEqual([]);
  });

  it("should filter out invalid objects", () => {
    const raw = [
      null,
      undefined,
      "not an object",
      { id: "1", name: "Valid" }, // valid
      { id: "", name: "No ID" }, // invalid
      { id: "2" }, // no name
    ];
    
    const result = sanitizeStoredLines(raw);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("1");
    expect(result[0].name).toBe("Valid");
  });

  it("should clamp quantity between 1 and 50", () => {
    const raw = [
      { id: "1", name: "Item 1", quantity: 0 },
      { id: "2", name: "Item 2", quantity: 100 },
      { id: "3", name: "Item 3", quantity: 5 },
      { id: "4", name: "Item 4", quantity: "invalid" },
    ];
    
    const result = sanitizeStoredLines(raw);
    
    expect(result.find(r => r.id === "1")?.quantity).toBe(1);
    expect(result.find(r => r.id === "2")?.quantity).toBe(50);
    expect(result.find(r => r.id === "3")?.quantity).toBe(5);
    expect(result.find(r => r.id === "4")?.quantity).toBe(1); // falls back to 1
  });

  it("should sanitize negative or invalid prices to 0", () => {
    const raw = [
      { id: "1", name: "Item 1", price: -10 },
      { id: "2", name: "Item 2", price: "free" },
      { id: "3", name: "Item 3", price: 15.5 },
    ];
    
    const result = sanitizeStoredLines(raw);
    
    expect(result.find(r => r.id === "1")?.price).toBe(0);
    expect(result.find(r => r.id === "2")?.price).toBe(0);
    expect(result.find(r => r.id === "3")?.price).toBe(15.5);
  });

  it("should prevent duplicate IDs in the cart", () => {
    const raw = [
      { id: "1", name: "Item 1" },
      { id: "1", name: "Item 1 duplicate" },
    ];
    
    const result = sanitizeStoredLines(raw);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe("Item 1");
  });
  
  it("should correctly handle itemId and flavor", () => {
    const raw = [
      { id: "1__spicy", itemId: "1", name: "Item 1", flavor: "spicy" },
    ];
    
    const result = sanitizeStoredLines(raw);
    expect(result[0].id).toBe("1__spicy");
    expect(result[0].itemId).toBe("1");
    expect(result[0].flavor).toBe("spicy");
  });
});
