import { describe, it, expect } from "vitest";
import { isValidOrderDate, minBookingDate, formatHumanDate, TIME_SLOTS, DELIVERY_FEE } from "./booking";

describe("booking.ts", () => {
  describe("isValidOrderDate", () => {
    it("should return true for a date that is tomorrow or later", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const validDate = new Date("2026-05-27T00:00:00Z");
      expect(isValidOrderDate(validDate, now)).toBe(true);
      
      const futureDate = new Date("2026-05-30T00:00:00Z");
      expect(isValidOrderDate(futureDate, now)).toBe(true);
    });

    it("should return false for today", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const today = new Date("2026-05-26T14:00:00Z");
      expect(isValidOrderDate(today, now)).toBe(false);
    });

    it("should return false for a past date", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      const pastDate = new Date("2026-05-25T12:00:00Z");
      expect(isValidOrderDate(pastDate, now)).toBe(false);
    });
  });

  describe("minBookingDate", () => {
    it("should return tomorrow's date as a YYYY-MM-DD string", () => {
      const now = new Date("2026-05-26T12:00:00Z");
      expect(minBookingDate(now)).toBe("2026-05-27");
    });

    it("should handle month boundaries correctly", () => {
      const now = new Date("2026-05-31T12:00:00Z");
      expect(minBookingDate(now)).toBe("2026-06-01");
    });
  });

  describe("formatHumanDate", () => {
    it("should format an ISO date string to a French human-readable string", () => {
      const iso = "2026-05-26";
      const result = formatHumanDate(iso);
      expect(result).toMatch(/26 mai 2026/); // the weekday will depend on the exact date, it's 'mardi'
    });

    it("should return an empty string if empty string is provided", () => {
      expect(formatHumanDate("")).toBe("");
    });
  });

  describe("Constants", () => {
    it("should have correct TIME_SLOTS", () => {
      expect(TIME_SLOTS).toContain("12h00 - 12h30");
      expect(TIME_SLOTS.length).toBeGreaterThan(0);
    });

    it("should have DELIVERY_FEE as 3", () => {
      expect(DELIVERY_FEE).toBe(3);
    });
  });
});