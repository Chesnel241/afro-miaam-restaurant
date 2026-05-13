"use client";

import { useAuth } from "@/components/AuthContext";
import { WelcomeNotification } from "./WelcomeNotification";
import { useState, useEffect } from "react";

export function AppOverlay() {
  const { user } = useAuth();
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Si l'utilisateur est connecté et que c'est son premier login
    if (user && user.isFirstLogin) {
      setShowWelcome(true);
    } else {
      setShowWelcome(false);
    }
  }, [user]);

  if (!showWelcome) return null;

  return <WelcomeNotification onClose={() => setShowWelcome(false)} />;
}
