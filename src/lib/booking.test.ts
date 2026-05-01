import { describe, expect, it } from "vitest";
import { DELIVERY_FEE, formatHumanDate, isValidOrderDate, minBookingDate, TIME_SLOTS } from "./booking";

describe("booking helpers", () => {
  it("exposes the expected time slots", () => {
    expect(TIME_SLOTS).toHaveLength(6);
    expect(TIME_SLOTS[0]).toContain("11:30");
  });

  it("computes the next booking date", () => {
    const now = new Date(2026, 4, 1, 12, 0, 0);
    expect(minBookingDate(now)).toBe("2026-05-02");
  });

  it("accepts only dates from tomorrow onward", () => {
    const now = new Date(2026, 4, 1, 12, 0, 0);

    expect(isValidOrderDate(new Date(2026, 4, 1), now)).toBe(false);
    expect(isValidOrderDate(new Date(2026, 4, 2), now)).toBe(true);
  });

  it("formats dates in French", () => {
    expect(formatHumanDate("2026-05-01")).toBe("vendredi 1 mai 2026");
  });

  it("exports the delivery fee constant", () => {
    expect(DELIVERY_FEE).toBe(2);
  });
});