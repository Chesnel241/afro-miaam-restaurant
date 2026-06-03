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

type SettingsContextType = {
  isReviewRewardActive: boolean;
  isWelcomeOfferActive: boolean;
  updateGlobalSettings: (settings: Record<string, boolean>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const POLL_INTERVAL_MS = 60_000;

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user, authFetch } = useAuth();
  const [isReviewRewardActive, setIsReviewRewardActive] = useState(true);
  const [isWelcomeOfferActive, setIsWelcomeOfferActive] = useState(true);
  const cancelledRef = useRef(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!user) return;
      try {
        const res = await authFetch("/api/settings/global", { signal });
        if (!res.ok) return;
        const data = (await res.json()) as {
          ok: boolean;
          settings?: { isReviewRewardActive?: boolean; isWelcomeOfferActive?: boolean };
        };
        if (!data.ok || cancelledRef.current) return;
        const s = data.settings ?? {};
        setIsReviewRewardActive(s.isReviewRewardActive ?? true);
        setIsWelcomeOfferActive(s.isWelcomeOfferActive ?? true);
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
    async (settings: Record<string, boolean>) => {
      if (!user || user.role !== "admin") return;
      const next = {
        isReviewRewardActive,
        isWelcomeOfferActive,
        ...settings,
      };
      const res = await authFetch("/api/admin/settings/global", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Mise à jour des paramètres impossible.");
      setIsReviewRewardActive(next.isReviewRewardActive);
      setIsWelcomeOfferActive(next.isWelcomeOfferActive);
    },
    [user, authFetch, isReviewRewardActive, isWelcomeOfferActive],
  );

  const contextValue = useMemo(
    () => ({
      isReviewRewardActive,
      isWelcomeOfferActive,
      updateGlobalSettings,
    }),
    [isReviewRewardActive, isWelcomeOfferActive, updateGlobalSettings],
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
