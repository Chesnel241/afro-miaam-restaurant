import { describe, it, expect } from "vitest";
import { isValidOrderDate, minBookingDate, formatHumanDate, TIME_SLOTS, DELIVERY_FEE } from "./booking";

describe("booking.ts", () => {
  describe("isValidOrderDate (legacy helper — same-day floor)", () => {
    it("returns true for today (policy is now same-day with lead time)", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const today = new Date("2026-05-26T14:00:00Z");
      expect(isValidOrderDate(today, now)).toBe(true);
    });

    it("returns true for tomorrow or later", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const tomorrow = new Date("2026-05-27T00:00:00Z");
      expect(isValidOrderDate(tomorrow, now)).toBe(true);
    });

    it("returns false for a past date", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const past = new Date("2026-05-25T12:00:00Z");
      expect(isValidOrderDate(past, now)).toBe(false);
    });
  });

  describe("minBookingDate", () => {
    it("now returns today (was: tomorrow); lead-time filtering happens at the slot picker", () => {
      // We can't pin a Z-time because minBookingDate uses local-time components
      // — so check the helper round-trips against a Date produced from local
      // components, matching the implementation.
      const localToday = new Date(2026, 4, 26, 12, 0, 0);
      expect(minBookingDate(localToday)).toBe("2026-05-26");
    });

    it("handles month boundaries correctly", () => {
      const localToday = new Date(2026, 4, 31, 12, 0, 0); // May 31 local
      expect(minBookingDate(localToday)).toBe("2026-05-31");
    });
  });

  describe("formatHumanDate", () => {
    it("formats an ISO date string to a French human-readable string", () => {
      const iso = "2026-05-26";
      const result = formatHumanDate(iso);
      expect(result).toMatch(/26 mai 2026/);
    });

    it("returns an empty string when given an empty string", () => {
      expect(formatHumanDate("")).toBe("");
    });
  });

  describe("Constants — fallback static slots", () => {
    it("derives slots from the default schedule (Mon 17:00..22:00, 30-min slots)", () => {
      // Now derived dynamically from defaultSchedule()/slotDurationMin so the
      // legacy lunch slots are gone; the new evening grid is in place.
      expect(TIME_SLOTS.length).toBe(10); // (22-17) * 60 / 30
      expect(TIME_SLOTS[0]).toBe("17h00 - 17h30");
      expect(TIME_SLOTS[TIME_SLOTS.length - 1]).toBe("21h30 - 22h00");
      // Old fixture slot should no longer appear in the default schedule.
      expect(TIME_SLOTS).not.toContain("12h00 - 12h30");
    });

    it("should have DELIVERY_FEE as 3", () => {
      expect(DELIVERY_FEE).toBe(3);
    });
  });
});
