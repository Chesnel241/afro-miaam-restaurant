-- =============================================================================
-- Migration 004 — extend settings.global with dynamic schedule
-- =============================================================================
-- The booking policy moves from "24h advance + fixed slot whitelist" to
-- "same-day with admin-configurable lead time, per-day-of-week opening hours,
-- and admin-configurable slot duration". The reservation flow now derives the
-- list of bookable slots dynamically from these fields.
--
-- Adds (when missing) the following keys inside settings.global.value:
--
--   schedule: Array(7) of { open: bool, openHHMM: "HH:MM", closeHHMM: "HH:MM" }
--             indexed 0=Sunday..6=Saturday (matches JavaScript Date.getDay())
--             default: open 17:00..22:00 Mon..Sat, closed Sunday
--
--   leadTimeMin: integer minutes between "now" and the earliest bookable slot
--                default: 180  (3 hours, the new policy)
--
--   slotDurationMin: integer minutes per slot, must be one of 15, 30, 60
--                    default: 30 (matches the legacy fixed grid)
--
-- Idempotent: uses jsonb_set with the create_missing flag, only writes a key
-- when it is currently absent in settings.global.value. Re-running this script
-- is a no-op once the keys are present, so it can ship in
-- /docker-entrypoint-initdb.d alongside the other migrations.
-- =============================================================================

DO $$
DECLARE
  v jsonb;
  defaults jsonb := jsonb_build_object(
    'schedule', jsonb_build_array(
      jsonb_build_object('open', false, 'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Sunday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Monday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Tuesday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Wednesday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Thursday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00'),  -- Friday
      jsonb_build_object('open', true,  'openHHMM', '17:00', 'closeHHMM', '22:00')   -- Saturday
    ),
    'leadTimeMin', 180,
    'slotDurationMin', 30
  );
BEGIN
  -- Ensure the 'global' row exists (it is seeded by 001_init.sql, but be safe
  -- in case an operator dropped it manually).
  INSERT INTO settings (key, value)
  VALUES ('global', jsonb_build_object(
    'isReviewRewardActive', true,
    'isWelcomeOfferActive', true
  ))
  ON CONFLICT (key) DO NOTHING;

  SELECT value INTO v FROM settings WHERE key = 'global';

  -- Merge in only the keys that are currently absent. `||` would overwrite
  -- existing edits; this approach preserves any operator-changed value.
  IF NOT v ? 'schedule' THEN
    v := jsonb_set(v, '{schedule}', defaults -> 'schedule', true);
  END IF;
  IF NOT v ? 'leadTimeMin' THEN
    v := jsonb_set(v, '{leadTimeMin}', defaults -> 'leadTimeMin', true);
  END IF;
  IF NOT v ? 'slotDurationMin' THEN
    v := jsonb_set(v, '{slotDurationMin}', defaults -> 'slotDurationMin', true);
  END IF;

  UPDATE settings SET value = v, updated_at = now() WHERE key = 'global';
END$$;
