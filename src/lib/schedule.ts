/**
 * Schedule + slot generation primitives — pure, dependency-free, isomorphic.
 *
 * Used by:
 *   - /api/admin/settings/[key] (validation on write)
 *   - /api/settings/global       (default + read shape)
 *   - /api/reservation           (server-side slot & lead-time enforcement)
 *   - /reservation/page.tsx      (client slot picker + earliest-date logic)
 *   - SettingsContext            (shape carried to consumers)
 *
 * Definitions:
 *   - `DaySchedule.open`     -> whether the restaurant accepts orders that day
 *   - `DaySchedule.openHHMM` -> opening time, "HH:MM" 24h format
 *   - `DaySchedule.closeHHMM`-> closing time, "HH:MM" 24h format
 *
 * The bookable window for a given day is [openHHMM, closeHHMM). Slots tile the
 * window left-to-right with `slotDurationMin` minutes each. A slot that would
 * cross closeHHMM is dropped (last slot ends exactly at closeHHMM or earlier).
 *
 * Lead time guarantee:
 *   A slot starting at T is bookable only if (now + leadTimeMin) <= T.
 *   Operators set this from the admin dashboard (default 180 = 3h, the new
 *   "same-day with 3h notice" policy).
 *
 * Indexing matches JavaScript `Date.getDay()` (0=Sunday..6=Saturday).
 */

export type DaySchedule = {
  open: boolean;
  openHHMM: string; // "HH:MM"
  closeHHMM: string; // "HH:MM"
};

export type WeekSchedule = readonly [
  DaySchedule, // 0 Sunday
  DaySchedule, // 1 Monday
  DaySchedule, // 2 Tuesday
  DaySchedule, // 3 Wednesday
  DaySchedule, // 4 Thursday
  DaySchedule, // 5 Friday
  DaySchedule, // 6 Saturday
];

export type GlobalSettings = {
  isReviewRewardActive: boolean;
  isWelcomeOfferActive: boolean;
  schedule: WeekSchedule;
  leadTimeMin: number;
  slotDurationMin: number;
};

export const ALLOWED_SLOT_DURATIONS = [15, 30, 60] as const;
export type SlotDuration = (typeof ALLOWED_SLOT_DURATIONS)[number];
export const MAX_LEAD_TIME_MIN = 60 * 24 * 14; // 14 days, far beyond any sensible value

const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** Matches "HH:MM" 24h. */
export function isHHMM(s: unknown): s is string {
  return typeof s === "string" && HHMM_RE.test(s);
}

/** Convert "HH:MM" to minutes since midnight (0..1439). */
export function hhmmToMinutes(s: string): number {
  const m = HHMM_RE.exec(s);
  if (!m) throw new Error(`invalid HHMM: ${s}`);
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Convert minutes since midnight to "HHhMM" (the French slot label used in the UI). */
export function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}h${String(m).padStart(2, "0")}`;
}

/** "HH:MM" -> "HHhMM" for consistency with the existing slot label format. */
export function hhmmToLabel(s: string): string {
  return minutesToLabel(hhmmToMinutes(s));
}

/** Build the canonical default schedule (matches migration 004 seed). */
export function defaultSchedule(): WeekSchedule {
  const evening: DaySchedule = { open: true, openHHMM: "17:00", closeHHMM: "22:00" };
  const closed: DaySchedule = { open: false, openHHMM: "17:00", closeHHMM: "22:00" };
  return [closed, evening, evening, evening, evening, evening, evening] as const;
}

export const DEFAULT_GLOBAL_SETTINGS: GlobalSettings = {
  isReviewRewardActive: true,
  isWelcomeOfferActive: true,
  schedule: defaultSchedule(),
  leadTimeMin: 180,
  slotDurationMin: 30,
};

/**
 * Validate a raw settings.global payload received from the admin.
 * Strict: rejects anything we wouldn't accept at runtime.
 * Allows extraneous flags (we ignore them) but the known fields must be valid.
 */
export function validateGlobalSettings(v: unknown): v is GlobalSettings {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;

  if (typeof o.isReviewRewardActive !== "boolean") return false;
  if (typeof o.isWelcomeOfferActive !== "boolean") return false;

  if (
    typeof o.leadTimeMin !== "number" ||
    !Number.isFinite(o.leadTimeMin) ||
    !Number.isInteger(o.leadTimeMin) ||
    o.leadTimeMin < 0 ||
    o.leadTimeMin > MAX_LEAD_TIME_MIN
  ) {
    return false;
  }
  if (
    typeof o.slotDurationMin !== "number" ||
    !ALLOWED_SLOT_DURATIONS.includes(o.slotDurationMin as SlotDuration)
  ) {
    return false;
  }
  if (!Array.isArray(o.schedule) || o.schedule.length !== 7) return false;
  for (const day of o.schedule) {
    if (!day || typeof day !== "object") return false;
    const d = day as Record<string, unknown>;
    if (typeof d.open !== "boolean") return false;
    if (!isHHMM(d.openHHMM)) return false;
    if (!isHHMM(d.closeHHMM)) return false;
    const o0 = hhmmToMinutes(d.openHHMM);
    const c0 = hhmmToMinutes(d.closeHHMM);
    if (c0 <= o0) return false; // must have at least one minute of opening
  }
  return true;
}

/**
 * Coerce a freshly-read settings.global value into a guaranteed-valid
 * GlobalSettings object, falling back to defaults for any missing/invalid
 * field. Never throws — used on read paths where rejecting the whole row would
 * mean rejecting the request.
 */
export function coerceGlobalSettings(v: unknown): GlobalSettings {
  const out: GlobalSettings = { ...DEFAULT_GLOBAL_SETTINGS };
  if (!v || typeof v !== "object") return out;
  const o = v as Record<string, unknown>;

  if (typeof o.isReviewRewardActive === "boolean") out.isReviewRewardActive = o.isReviewRewardActive;
  if (typeof o.isWelcomeOfferActive === "boolean") out.isWelcomeOfferActive = o.isWelcomeOfferActive;

  if (
    typeof o.leadTimeMin === "number" &&
    Number.isInteger(o.leadTimeMin) &&
    o.leadTimeMin >= 0 &&
    o.leadTimeMin <= MAX_LEAD_TIME_MIN
  ) {
    out.leadTimeMin = o.leadTimeMin;
  }
  if (
    typeof o.slotDurationMin === "number" &&
    (ALLOWED_SLOT_DURATIONS as readonly number[]).includes(o.slotDurationMin)
  ) {
    out.slotDurationMin = o.slotDurationMin as SlotDuration;
  }

  if (Array.isArray(o.schedule) && o.schedule.length === 7) {
    const candidate: DaySchedule[] = [];
    let allOk = true;
    for (const day of o.schedule) {
      if (
        !day ||
        typeof day !== "object" ||
        typeof (day as Record<string, unknown>).open !== "boolean" ||
        !isHHMM((day as Record<string, unknown>).openHHMM) ||
        !isHHMM((day as Record<string, unknown>).closeHHMM)
      ) {
        allOk = false;
        break;
      }
      const d = day as Record<string, unknown>;
      const o1 = hhmmToMinutes(d.openHHMM as string);
      const c1 = hhmmToMinutes(d.closeHHMM as string);
      if (c1 <= o1) {
        allOk = false;
        break;
      }
      candidate.push({
        open: d.open as boolean,
        openHHMM: d.openHHMM as string,
        closeHHMM: d.closeHHMM as string,
      });
    }
    if (allOk) {
      out.schedule = candidate as unknown as WeekSchedule;
    }
  }
  return out;
}

/**
 * Generate the slot labels for a single day, given its schedule and a slot
 * duration. Format: "HHhMM - HHhMM". Empty array when the day is closed or
 * the window is too short for one slot.
 */
export function generateDaySlots(day: DaySchedule, slotDurationMin: number): string[] {
  if (!day.open) return [];
  const start = hhmmToMinutes(day.openHHMM);
  const end = hhmmToMinutes(day.closeHHMM);
  if (slotDurationMin <= 0 || end - start < slotDurationMin) return [];
  const slots: string[] = [];
  for (let t = start; t + slotDurationMin <= end; t += slotDurationMin) {
    slots.push(`${minutesToLabel(t)} - ${minutesToLabel(t + slotDurationMin)}`);
  }
  return slots;
}

/**
 * Parse a slot label of the form "HHhMM - HHhMM" back to { startMin, endMin }.
 * Returns null on malformed input.
 */
export function parseSlot(slot: string): { startMin: number; endMin: number } | null {
  const m = /^(\d{2})h(\d{2})\s*-\s*(\d{2})h(\d{2})$/.exec(slot);
  if (!m) return null;
  const startMin = Number(m[1]) * 60 + Number(m[2]);
  const endMin = Number(m[3]) * 60 + Number(m[4]);
  if (
    Number.isNaN(startMin) ||
    Number.isNaN(endMin) ||
    startMin < 0 || startMin > 1439 ||
    endMin <= startMin || endMin > 1440
  ) {
    return null;
  }
  return { startMin, endMin };
}

/**
 * Result of validating a (date, slot) submission against the live schedule.
 * If `ok` is false, `reason` explains why (used as the customer-facing error).
 */
export type BookingCheck =
  | { ok: true }
  | { ok: false; reason: string };

/**
 * Server-side enforcement: given the chosen date (ISO YYYY-MM-DD), the chosen
 * slot label, the active schedule, the lead time, the slot duration, and a
 * `now` reference, return whether the submission is acceptable.
 *
 * - The date must not be in the past.
 * - The day-of-week must be open.
 * - The slot must be among the slots generated for that day.
 * - The slot start must be at least `leadTimeMin` minutes after `now`.
 *
 * All computations are done in the server's local time zone — the deployment's
 * TZ env determines what "today" means, so set TZ accordingly in production
 * (e.g. Europe/Paris).
 */
export function isValidBooking(args: {
  date: string;
  slot: string;
  settings: GlobalSettings;
  now?: Date;
}): BookingCheck {
  const now = args.now ?? new Date();
  const { settings, date, slot } = args;

  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return { ok: false, reason: "Date invalide." };
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  // Use the server's local TZ for day-of-week + start-of-day arithmetic.
  const dayStart = new Date(y, mo, d, 0, 0, 0, 0);
  if (Number.isNaN(dayStart.getTime())) return { ok: false, reason: "Date invalide." };
  // Reject a date in the past (today is fine — lead-time check below).
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (dayStart.getTime() < todayStart.getTime()) {
    return { ok: false, reason: "Date passée." };
  }

  const dow = dayStart.getDay();
  const daySchedule = settings.schedule[dow];
  if (!daySchedule || !daySchedule.open) {
    return { ok: false, reason: "Le restaurant est fermé ce jour-là." };
  }

  const parsed = parseSlot(slot);
  if (!parsed) return { ok: false, reason: "Créneau invalide." };

  const dayOpen = hhmmToMinutes(daySchedule.openHHMM);
  const dayClose = hhmmToMinutes(daySchedule.closeHHMM);

  if (parsed.startMin < dayOpen || parsed.endMin > dayClose) {
    return { ok: false, reason: "Créneau hors des heures d'ouverture." };
  }
  if (parsed.endMin - parsed.startMin !== settings.slotDurationMin) {
    return { ok: false, reason: "Créneau invalide." };
  }
  // The slot must align on the slot grid (open + k*duration).
  if ((parsed.startMin - dayOpen) % settings.slotDurationMin !== 0) {
    return { ok: false, reason: "Créneau invalide." };
  }

  // Lead time: now + leadTimeMin <= slotStart
  const slotStartDate = new Date(y, mo, d, 0, parsed.startMin, 0, 0);
  if (slotStartDate.getTime() - now.getTime() < settings.leadTimeMin * 60_000) {
    const hours = Math.round(settings.leadTimeMin / 60);
    return {
      ok: false,
      reason:
        settings.leadTimeMin >= 60
          ? `Ce créneau est trop proche. Réservez au moins ${hours} h à l'avance.`
          : `Ce créneau est trop proche. Réservez au moins ${settings.leadTimeMin} minutes à l'avance.`,
    };
  }

  return { ok: true };
}

/**
 * Compute the earliest bookable (date, slot) for the current schedule.
 *
 * Walks day by day starting from today; for each open day, returns the first
 * slot whose start is at least `leadTimeMin` minutes after `now`. Bounded by
 * 14 days so we never spin if every day is closed (defensive).
 *
 * Returns null when the next 14 days have no bookable slot — the UI should
 * display "Réservations momentanément indisponibles" in that case.
 */
export function earliestBookable(settings: GlobalSettings, now: Date = new Date()): { date: string; slot: string } | null {
  for (let offset = 0; offset < 14; offset++) {
    const probe = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 0, 0, 0, 0);
    const dow = probe.getDay();
    const day = settings.schedule[dow];
    if (!day || !day.open) continue;
    const slots = generateDaySlots(day, settings.slotDurationMin);
    if (slots.length === 0) continue;
    const dateIso = `${probe.getFullYear()}-${String(probe.getMonth() + 1).padStart(2, "0")}-${String(probe.getDate()).padStart(2, "0")}`;
    for (const s of slots) {
      const p = parseSlot(s);
      if (!p) continue;
      const slotStart = new Date(probe.getFullYear(), probe.getMonth(), probe.getDate(), 0, p.startMin, 0, 0);
      if (slotStart.getTime() - now.getTime() >= settings.leadTimeMin * 60_000) {
        return { date: dateIso, slot: s };
      }
    }
  }
  return null;
}

/**
 * For a given date, return the bookable slots: filtered by `now + leadTimeMin`
 * when `date` is today. Used by the client picker to grey out unbookable
 * earlier-today slots.
 */
export function bookableSlotsForDate(args: {
  date: string;
  settings: GlobalSettings;
  now?: Date;
}): string[] {
  const now = args.now ?? new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(args.date);
  if (!m) return [];
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const probe = new Date(y, mo, d, 0, 0, 0, 0);
  if (Number.isNaN(probe.getTime())) return [];
  const dow = probe.getDay();
  const day = args.settings.schedule[dow];
  if (!day || !day.open) return [];
  const all = generateDaySlots(day, args.settings.slotDurationMin);
  // For days strictly after today, no lead-time filtering is needed beyond the
  // first earliest-slot check (lead time of e.g. 6h still allows tomorrow's
  // entire day). For today, drop slots that violate `now + leadTime > start`.
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  if (probe.getTime() === todayStart.getTime()) {
    const cutoff = now.getTime() + args.settings.leadTimeMin * 60_000;
    return all.filter((s) => {
      const p = parseSlot(s);
      if (!p) return false;
      const slotStart = new Date(y, mo, d, 0, p.startMin, 0, 0);
      return slotStart.getTime() >= cutoff;
    });
  }
  return all;
}

/** Human-readable French day name for the UI (0=Sunday..6=Saturday). */
export const DAY_NAMES_FR: readonly string[] = [
  "Dimanche",
  "Lundi",
  "Mardi",
  "Mercredi",
  "Jeudi",
  "Vendredi",
  "Samedi",
];
