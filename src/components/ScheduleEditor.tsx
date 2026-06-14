"use client";

import { useState } from "react";
import { useSettings } from "@/components/SettingsContext";
import {
  ALLOWED_SLOT_DURATIONS,
  DAY_NAMES_FR,
  type DaySchedule,
  type WeekSchedule,
} from "@/lib/schedule";

/**
 * Admin editor for the weekly opening schedule + booking lead time + slot
 * duration. Wired against settings.global through the SettingsContext.
 *
 * UX choices:
 *   - 7-day grid (Sunday..Saturday) with a toggle + 2 time inputs per day.
 *   - "Appliquer à tous" button to copy day 1 (Monday)'s hours across the week
 *     so the operator doesn't have to repeat the same hours seven times when
 *     they only differ on Sunday.
 *   - Lead time in hours (integer, 0..72), translated to minutes on save.
 *   - Slot duration as a 3-button picker (15 / 30 / 60).
 *   - Save is explicit: edits are buffered locally and committed on click —
 *     prevents a half-typed time from being persisted on every keystroke.
 */
export function ScheduleEditor() {
  const { schedule, leadTimeMin, slotDurationMin, updateGlobalSettings } = useSettings();

  // Local draft buffer. Initialized from the context; kept in sync via the
  // `revision` key when the user clicks "Annuler" or after a successful save.
  const [draftSchedule, setDraftSchedule] = useState<WeekSchedule>(schedule);
  const [draftLeadHours, setDraftLeadHours] = useState<number>(Math.max(0, Math.round(leadTimeMin / 60)));
  const [draftDuration, setDraftDuration] = useState<number>(slotDurationMin);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [okMsg, setOkMsg] = useState("");

  // Re-sync the draft when the upstream settings change (e.g. another admin
  // edited them via the same dashboard). `revision` lets us also force this
  // on a manual "Annuler".
  useSyncDraft(schedule, leadTimeMin, slotDurationMin, revision, {
    setDraftSchedule,
    setDraftLeadHours,
    setDraftDuration,
  });

  const updateDay = (dayIdx: number, patch: Partial<DaySchedule>) => {
    setDraftSchedule((prev) => {
      const next = [...prev] as DaySchedule[];
      next[dayIdx] = { ...next[dayIdx], ...patch };
      return next as unknown as WeekSchedule;
    });
  };

  const copyMondayToAll = () => {
    setDraftSchedule((prev) => {
      const mon = prev[1];
      // Apply Monday's hours to the rest, keeping each day's `open` flag.
      const next = prev.map((d, i) => (i === 1 ? d : { ...d, openHHMM: mon.openHHMM, closeHHMM: mon.closeHHMM }));
      return next as unknown as WeekSchedule;
    });
  };

  const handleSave = async () => {
    setError("");
    setOkMsg("");
    // Client-side sanity: each open day must have close > open.
    for (let i = 0; i < draftSchedule.length; i++) {
      const d = draftSchedule[i];
      if (d.openHHMM >= d.closeHHMM) {
        setError(`${DAY_NAMES_FR[i]}: l'heure de fermeture doit être après l'ouverture.`);
        return;
      }
    }
    const leadTimeMinNext = Math.max(0, Math.min(72, Math.round(draftLeadHours))) * 60;
    setBusy(true);
    try {
      await updateGlobalSettings({
        schedule: draftSchedule,
        leadTimeMin: leadTimeMinNext,
        slotDurationMin: draftDuration as 15 | 30 | 60,
      });
      setOkMsg("Horaires enregistrés.");
      setTimeout(() => setOkMsg(""), 3000);
    } catch (e) {
      setError((e as Error).message || "Échec de l'enregistrement.");
    } finally {
      setBusy(false);
    }
  };

  const handleReset = () => {
    setRevision((r) => r + 1);
    setError("");
    setOkMsg("");
  };

  return (
    <div className="rounded-3xl bg-white p-8 shadow-card ring-1 ring-cream/10">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h3 className="heading-display text-xl text-primary">Horaires &amp; créneaux</h3>
          <p className="mt-1 text-[10px] text-primary/40">
            Pilote les horaires d&apos;ouverture par jour, le délai minimum avant un créneau, et la durée d&apos;un créneau. S&apos;applique immédiatement au formulaire de réservation.
          </p>
        </div>
        <button
          type="button"
          onClick={copyMondayToAll}
          className="rounded-full bg-creamSoft px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-cream"
          title="Copier les horaires de lundi sur tous les jours ouverts"
        >
          Appliquer à tous
        </button>
      </div>

      <div className="space-y-3">
        {draftSchedule.map((day, i) => (
          <div
            key={i}
            className="grid grid-cols-[110px_60px_1fr_1fr] items-center gap-3 rounded-2xl border border-cream/20 bg-creamSoft/40 p-3"
          >
            <label className="text-sm font-bold text-primary">{DAY_NAMES_FR[i]}</label>
            <button
              type="button"
              onClick={() => updateDay(i, { open: !day.open })}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${
                day.open ? "bg-accent" : "bg-primary/20"
              }`}
              aria-label={day.open ? "Ouvert" : "Fermé"}
              aria-pressed={day.open}
            >
              <span
                className={`mt-1 inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
                  day.open ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <input
              type="time"
              value={day.openHHMM}
              disabled={!day.open}
              onChange={(e) => updateDay(i, { openHHMM: e.target.value })}
              className="rounded-lg border border-cream/30 bg-white px-3 py-2 text-sm text-primary disabled:opacity-50"
            />
            <input
              type="time"
              value={day.closeHHMM}
              disabled={!day.open}
              onChange={(e) => updateDay(i, { closeHHMM: e.target.value })}
              className="rounded-lg border border-cream/30 bg-white px-3 py-2 text-sm text-primary disabled:opacity-50"
            />
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-cream/20 bg-creamSoft/40 p-4">
          <label htmlFor="leadTime" className="text-xs font-bold uppercase tracking-widest text-primary">
            Délai minimum (heures)
          </label>
          <input
            id="leadTime"
            type="number"
            min={0}
            max={72}
            step={1}
            value={draftLeadHours}
            onChange={(e) => setDraftLeadHours(Math.max(0, Math.min(72, Number(e.target.value) || 0)))}
            className="mt-2 w-full rounded-lg border border-cream/30 bg-white px-3 py-2 text-sm"
          />
          <p className="mt-1 text-[10px] text-primary/40">
            Temps minimum entre la réservation et le créneau. Par défaut 3 h.
          </p>
        </div>
        <div className="rounded-2xl border border-cream/20 bg-creamSoft/40 p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Durée d&apos;un créneau</p>
          <div className="mt-2 flex gap-2">
            {ALLOWED_SLOT_DURATIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDraftDuration(d)}
                className={`flex-1 rounded-lg px-3 py-2 text-sm font-bold transition ${
                  draftDuration === d
                    ? "bg-accent text-white"
                    : "bg-white text-primary ring-1 ring-cream/30 hover:bg-cream/30"
                }`}
              >
                {d} min
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-xs font-bold text-red-700">{error}</p>
      )}
      {okMsg && (
        <p className="mt-4 rounded-lg bg-emerald-50 px-4 py-2 text-xs font-bold text-emerald-700">{okMsg}</p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-full bg-creamSoft px-5 py-2 text-xs font-bold uppercase tracking-widest text-primary hover:bg-cream disabled:opacity-50"
          disabled={busy}
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="rounded-full bg-accent px-5 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-md hover:opacity-90 disabled:opacity-50"
          disabled={busy}
        >
          {busy ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}

// Re-syncs the draft buffer with upstream settings — split out as a tiny hook
// for readability. Triggered when the settings change OR when the operator
// hits "Annuler" (revision bumps).
import { useEffect } from "react";
function useSyncDraft(
  schedule: WeekSchedule,
  leadTimeMin: number,
  slotDurationMin: number,
  revision: number,
  setters: {
    setDraftSchedule: (s: WeekSchedule) => void;
    setDraftLeadHours: (n: number) => void;
    setDraftDuration: (n: number) => void;
  },
) {
  const { setDraftSchedule, setDraftLeadHours, setDraftDuration } = setters;
  useEffect(() => {
    setDraftSchedule(schedule);
    setDraftLeadHours(Math.max(0, Math.round(leadTimeMin / 60)));
    setDraftDuration(slotDurationMin);
  }, [schedule, leadTimeMin, slotDurationMin, revision, setDraftSchedule, setDraftLeadHours, setDraftDuration]);
}
