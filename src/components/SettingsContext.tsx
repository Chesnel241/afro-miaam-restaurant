"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "./AuthContext";

type SettingsContextType = {
  isReviewRewardActive: boolean;
  isWelcomeOfferActive: boolean;
  updateGlobalSettings: (settings: Record<string, boolean>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isReviewRewardActive, setIsReviewRewardActive] = useState(true);
  const [isWelcomeOfferActive, setIsWelcomeOfferActive] = useState(true);

  useEffect(() => {
    if (!user) return;

    const unsub = onSnapshot(
      doc(db, "settings", "global"),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsReviewRewardActive(data.isReviewRewardActive ?? true);
          setIsWelcomeOfferActive(data.isWelcomeOfferActive ?? true);
        }
      },
      (err) => {
        console.warn("SETTINGS_SNAPSHOT_ERROR", (err as { code?: string }).code ?? "unknown");
      },
    );
    return () => unsub();
  }, [user?.id, user?.role, user?.email]);

  const updateGlobalSettings = useCallback(async (settings: Record<string, boolean>) => {
    const settingsRef = doc(db, "settings", "global");
    await setDoc(settingsRef, settings, { merge: true });
  }, []);

  const contextValue = useMemo(
    () => ({
      isReviewRewardActive,
      isWelcomeOfferActive,
      updateGlobalSettings,
    }),
    [isReviewRewardActive, isWelcomeOfferActive, updateGlobalSettings]
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
