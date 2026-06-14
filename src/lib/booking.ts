/**
 * Booking helpers.
 *
 * Historically this module owned a hardcoded TIME_SLOTS list and a "24h
 * advance" rule. Both are now derived dynamically from `settings.global`
 * (admin-configurable schedule + lead time + slot duration). The exports below
 * remain for backward compatibility with components that still want a static
 * fallback shape — the source of truth is `@/lib/schedule`.
 */

import { DEFAULT_GLOBAL_SETTINGS, defaultSchedule, generateDaySlots } from "@/lib/schedule";

// Static fallback: the slots a customer would see on a typical default day
// (Monday, 17:00-22:00, 30-min slots). Used by legacy admin BI charts that
// pre-group orders by slot; the customer-facing reservation flow now derives
// slots dynamically from the live settings.
export const TIME_SLOTS: readonly string[] = (() => {
  const sched = defaultSchedule();
  return generateDaySlots(sched[1], DEFAULT_GLOBAL_SETTINGS.slotDurationMin);
})();

/**
 * Legacy validator: now uses today (not tomorrow) as the floor, since the
 * policy moved from "24h advance" to "same-day with lead time". The lead-time
 * cutoff is enforced separately by `isValidBooking` in @/lib/schedule using
 * the live settings.
 */
export function isValidOrderDate(selected: Date, now: Date = new Date()): boolean {
  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  const selectedDay = new Date(selected);
  selectedDay.setHours(0, 0, 0, 0);
  return selectedDay.getTime() >= minDate.getTime();
}

/**
 * The earliest date the customer may PICK (today). Lead-time filtering of
 * today's slots happens at the slot picker level (bookableSlotsForDate).
 */
export function minBookingDate(now: Date = new Date()): string {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function formatHumanDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const DELIVERY_FEE = 3;
