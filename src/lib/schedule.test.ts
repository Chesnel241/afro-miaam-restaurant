import { describe, it, expect } from "vitest";
import {
  bookableSlotsForDate,
  coerceGlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  defaultSchedule,
  earliestBookable,
  generateDaySlots,
  hhmmToMinutes,
  isHHMM,
  isValidBooking,
  minutesToLabel,
  parseSlot,
  validateGlobalSettings,
  type WeekSchedule,
} from "./schedule";

const allOpen: WeekSchedule = Array.from({ length: 7 }, () => ({
  open: true,
  openHHMM: "00:00",
  closeHHMM: "23:30",
})) as unknown as WeekSchedule;

describe("schedule.ts — HH:MM parsing", () => {
  it("accepts valid HH:MM", () => {
    expect(isHHMM("00:00")).toBe(true);
    expect(isHHMM("17:00")).toBe(true);
    expect(isHHMM("23:59")).toBe(true);
  });
  it("rejects malformed HH:MM", () => {
    expect(isHHMM("24:00")).toBe(false);
    expect(isHHMM("9:00")).toBe(false);
    expect(isHHMM("17h00")).toBe(false);
    expect(isHHMM("")).toBe(false);
  });
  it("converts between HH:MM and minutes round-trips", () => {
    expect(hhmmToMinutes("17:30")).toBe(17 * 60 + 30);
    expect(minutesToLabel(17 * 60 + 30)).toBe("17h30");
  });
});

describe("schedule.ts — generateDaySlots", () => {
  it("returns [] when the day is closed", () => {
    expect(generateDaySlots({ open: false, openHHMM: "17:00", closeHHMM: "22:00" }, 30)).toEqual([]);
  });
  it("tiles 17:00..22:00 with 30-min slots (10 entries)", () => {
    const slots = generateDaySlots({ open: true, openHHMM: "17:00", closeHHMM: "22:00" }, 30);
    expect(slots.length).toBe(10);
    expect(slots[0]).toBe("17h00 - 17h30");
    expect(slots[slots.length - 1]).toBe("21h30 - 22h00");
  });
  it("does NOT cross the closing time with a partial slot", () => {
    // 17:00 .. 17:40 with 30-min slots → only one slot 17h00-17h30 fits
    const slots = generateDaySlots({ open: true, openHHMM: "17:00", closeHHMM: "17:40" }, 30);
    expect(slots).toEqual(["17h00 - 17h30"]);
  });
  it("supports 60-min slots", () => {
    const slots = generateDaySlots({ open: true, openHHMM: "17:00", closeHHMM: "22:00" }, 60);
    expect(slots).toEqual(["17h00 - 18h00", "18h00 - 19h00", "19h00 - 20h00", "20h00 - 21h00", "21h00 - 22h00"]);
  });
});

describe("schedule.ts — parseSlot", () => {
  it("parses standard slot labels", () => {
    expect(parseSlot("17h00 - 17h30")).toEqual({ startMin: 1020, endMin: 1050 });
  });
  it("rejects malformed labels", () => {
    expect(parseSlot("17:00 - 17:30")).toBeNull();
    expect(parseSlot("nope")).toBeNull();
    expect(parseSlot("18h00 - 17h30")).toBeNull(); // end before start
  });
});

describe("schedule.ts — validateGlobalSettings", () => {
  it("accepts the default settings", () => {
    expect(validateGlobalSettings(DEFAULT_GLOBAL_SETTINGS)).toBe(true);
  });
  it("rejects missing schedule", () => {
    const v = { ...DEFAULT_GLOBAL_SETTINGS } as Record<string, unknown>;
    delete v.schedule;
    expect(validateGlobalSettings(v)).toBe(false);
  });
  it("rejects schedule with the wrong length", () => {
    const v = { ...DEFAULT_GLOBAL_SETTINGS, schedule: DEFAULT_GLOBAL_SETTINGS.schedule.slice(0, 6) };
    expect(validateGlobalSettings(v)).toBe(false);
  });
  it("rejects an open day where close <= open", () => {
    const bad = defaultSchedule().slice();
    bad[1] = { open: true, openHHMM: "20:00", closeHHMM: "20:00" };
    expect(validateGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, schedule: bad as unknown as WeekSchedule })).toBe(false);
  });
  it("rejects an unsupported slot duration", () => {
    expect(validateGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, slotDurationMin: 45 as never })).toBe(false);
  });
  it("rejects a negative lead time", () => {
    expect(validateGlobalSettings({ ...DEFAULT_GLOBAL_SETTINGS, leadTimeMin: -1 })).toBe(false);
  });
});

describe("schedule.ts — coerceGlobalSettings", () => {
  it("returns defaults for null/undefined", () => {
    expect(coerceGlobalSettings(null)).toEqual(DEFAULT_GLOBAL_SETTINGS);
    expect(coerceGlobalSettings(undefined)).toEqual(DEFAULT_GLOBAL_SETTINGS);
  });
  it("falls back to defaults for malformed schedule entries", () => {
    const partial = { isReviewRewardActive: false, schedule: "not an array" };
    const out = coerceGlobalSettings(partial);
    expect(out.isReviewRewardActive).toBe(false); // accepted
    expect(out.schedule).toEqual(DEFAULT_GLOBAL_SETTINGS.schedule); // fallback
  });
});

describe("schedule.ts — isValidBooking", () => {
  const baseSettings = { ...DEFAULT_GLOBAL_SETTINGS, schedule: allOpen, leadTimeMin: 180 };

  it("accepts a today slot beyond the lead time", () => {
    const now = new Date(2026, 5, 14, 9, 0, 0); // Sunday in 2026 — but allOpen
    const dateIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const res = isValidBooking({ date: dateIso, slot: "13h00 - 13h30", settings: baseSettings, now });
    expect(res.ok).toBe(true);
  });

  it("rejects a today slot inside the lead time", () => {
    const now = new Date(2026, 5, 14, 9, 0, 0);
    const dateIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const res = isValidBooking({ date: dateIso, slot: "10h00 - 10h30", settings: baseSettings, now });
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toMatch(/trop proche|au moins/i);
  });

  it("rejects a closed day", () => {
    const closedSettings = { ...DEFAULT_GLOBAL_SETTINGS, leadTimeMin: 0 };
    // 2026-06-14 is a Sunday; the default schedule closes Sunday.
    const res = isValidBooking({ date: "2026-06-14", slot: "17h00 - 17h30", settings: closedSettings, now: new Date(2026, 5, 14, 8, 0, 0) });
    expect(res.ok).toBe(false);
  });

  it("rejects a slot that is misaligned with the grid", () => {
    const res = isValidBooking({
      date: "2026-06-15", // Monday
      slot: "17h15 - 17h45",
      settings: { ...DEFAULT_GLOBAL_SETTINGS, leadTimeMin: 0 },
      now: new Date(2026, 5, 14, 8, 0, 0),
    });
    expect(res.ok).toBe(false);
  });
});

describe("schedule.ts — earliestBookable + bookableSlotsForDate", () => {
  it("skips Sunday in the default schedule and returns Monday's first slot", () => {
    // Saturday 2026-06-13 23:50 → next bookable is Monday 17:00.
    const sat = new Date(2026, 5, 13, 23, 50, 0);
    const result = earliestBookable(DEFAULT_GLOBAL_SETTINGS, sat);
    expect(result?.date).toBe("2026-06-15");
    expect(result?.slot).toBe("17h00 - 17h30");
  });

  it("filters out earlier-today slots when on the same day as now", () => {
    // Monday 2026-06-15 at 18:30 → first bookable slot today is 21h30-22h00
    // (because leadTimeMin=180 → 21:30 is the first that respects the cutoff).
    const mon = new Date(2026, 5, 15, 18, 30, 0);
    const slots = bookableSlotsForDate({
      date: "2026-06-15",
      settings: DEFAULT_GLOBAL_SETTINGS,
      now: mon,
    });
    expect(slots[0]).toBe("21h30 - 22h00");
  });

  it("returns the full grid for a future date (lead time irrelevant)", () => {
    const mon = new Date(2026, 5, 15, 18, 30, 0);
    const slots = bookableSlotsForDate({
      date: "2026-06-16", // tomorrow
      settings: DEFAULT_GLOBAL_SETTINGS,
      now: mon,
    });
    expect(slots).toEqual([
      "17h00 - 17h30",
      "17h30 - 18h00",
      "18h00 - 18h30",
      "18h30 - 19h00",
      "19h00 - 19h30",
      "19h30 - 20h00",
      "20h00 - 20h30",
      "20h30 - 21h00",
      "21h00 - 21h30",
      "21h30 - 22h00",
    ]);
  });

  it("returns [] for a closed day", () => {
    const sat = new Date(2026, 5, 13, 10, 0, 0);
    const slots = bookableSlotsForDate({ date: "2026-06-14", settings: DEFAULT_GLOBAL_SETTINGS, now: sat });
    expect(slots).toEqual([]);
  });
});
