"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { useAuth } from "./AuthContext";
import {
  coerceGlobalSettings,
  DEFAULT_GLOBAL_SETTINGS,
  type GlobalSettings,
  type WeekSchedule,
} from "@/lib/schedule";

type SettingsContextType = {
  // Legacy flags, kept for backward compatibility with admin & mon-compte
  // consumers (admin/page.tsx, mon-compte/page.tsx).
  isReviewRewardActive: boolean;
  isWelcomeOfferActive: boolean;
  // New dynamic-schedule fields.
  schedule: WeekSchedule;
  leadTimeMin: number;
  slotDurationMin: number;
  // Convenient typed alias of the same data, for consumers that prefer the
  // single object shape (e.g. the reservation page slot computation).
  settings: GlobalSettings;
  // Updates accept a partial — server validation ensures the result is sane.
  updateGlobalSettings: (patch: Partial<GlobalSettings>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 60_000;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, authFetch } = useAuth();
  const [settings, setSettings] = useState<GlobalSettings>(DEFAULT_GLOBAL_SETTINGS);
  const cancelledRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      try {
        const res = await authFetch("/api/settings/global", { signal });
        if (!res.ok) return;
        const data = (await res.json()) as { ok: boolean; settings?: unknown };
        if (!data.ok || cancelledRef.current) return;
        setSettings(coerceGlobalSettings(data.settings));
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          console.warn("SETTINGS_FETCH_FAILED", (e as Error).message);
        }
      }
    },
    [user, authFetch],
  );

  useEffect(() => {
    cancelledRef.current = false;
    if (!user) return;
    const ctrl = new AbortController();
    load(ctrl.signal);
    const id = setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, POLL_INTERVAL_MS);
    return () => {
      cancelledRef.current = true;
      ctrl.abort();
      clearInterval(id);
    };
  }, [user, load]);

  const updateGlobalSettings = useCallback(
    async (patch: Partial<GlobalSettings>) => {
      if (!user || user.role !== "admin") return;
      // Merge with the currently-known settings so the PATCH carries the full
      // shape (the server validator demands every field). State is updated
      // optimistically and resynced on the next poll.
      const next: GlobalSettings = coerceGlobalSettings({ ...settings, ...patch });
      const res = await authFetch("/api/admin/settings/global", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Mise à jour des paramètres impossible.");
      setSettings(next);
    },
    [user, authFetch, settings],
  );

  const contextValue = useMemo<SettingsContextType>(
    () => ({
      isReviewRewardActive: settings.isReviewRewardActive,
      isWelcomeOfferActive: settings.isWelcomeOfferActive,
      schedule: settings.schedule,
      leadTimeMin: settings.leadTimeMin,
      slotDurationMin: settings.slotDurationMin,
      settings,
      updateGlobalSettings,
    }),
    [settings, updateGlobalSettings],
  );

  return (
    <SettingsContext.Provider value={contextValue}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings doit être utilisé à l'intérieur d'un SettingsProvider");
  }
  return context;
}
