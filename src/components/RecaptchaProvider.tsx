"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * RecaptchaProvider
 * -----------------
 * Loads the Google reCAPTCHA v3 script exactly once on the client and exposes
 * a `useRecaptcha()` hook with a `getToken(action)` helper.
 *
 * Design notes:
 * - The script is appended lazily on mount of the provider so that pages that
 *   don't need reCAPTCHA never download it.
 * - If `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` is missing (e.g. local dev), every
 *   `getToken(...)` resolves to `null`. The server treats null as "no token";
 *   in non-production it accepts that, in production it fails closed.
 * - `useRecaptcha()` is safe to call even when this provider is NOT mounted —
 *   it returns a `getToken` that resolves to null. AuthContext relies on this
 *   so it doesn't break when the lead hasn't wired the provider in layout yet.
 */

type RecaptchaContextValue = {
  getToken: (action: string) => Promise<string | null>;
};

const NULL_CONTEXT: RecaptchaContextValue = {
  getToken: async () => null,
};

const RecaptchaContext = createContext<RecaptchaContextValue | undefined>(
  undefined,
);

// Minimal subset of the grecaptcha API we use.
type Grecaptcha = {
  ready: (cb: () => void) => void;
  execute: (
    siteKey: string,
    options: { action: string },
  ) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: Grecaptcha;
  }
}

const SCRIPT_ID = "afro-recaptcha-v3";

export function RecaptchaProvider({ children }: { children: React.ReactNode }) {
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  const [ready, setReady] = useState(false);
  // We keep a single in-flight readiness promise so concurrent getToken()
  // callers all await the same "script loaded + grecaptcha.ready" event.
  const readyPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!siteKey) return;
    if (ready) return;

    // If the script is already on the page (e.g. HMR), reuse it.
    const existing = document.getElementById(SCRIPT_ID) as
      | HTMLScriptElement
      | null;

    const waitReady = () =>
      new Promise<void>((resolve) => {
        const tryReady = () => {
          if (window.grecaptcha && typeof window.grecaptcha.ready === "function") {
            window.grecaptcha.ready(() => resolve());
          } else {
            setTimeout(tryReady, 50);
          }
        };
        tryReady();
      });

    if (existing) {
      readyPromiseRef.current = waitReady().then(() => setReady(true));
      return;
    }

    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = `https://www.google.com/recaptcha/api.js?render=${encodeURIComponent(siteKey)}`;
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);

    readyPromiseRef.current = waitReady().then(() => setReady(true));
    // We intentionally do NOT remove the script on unmount: reCAPTCHA v3
    // installs global handlers and removing them mid-session breaks things
    // for any other component that loaded a token.
  }, [siteKey, ready]);

  const getToken = useCallback(
    async (action: string): Promise<string | null> => {
      if (!siteKey) return null;
      if (typeof window === "undefined") return null;

      // Make sure the script has finished loading and grecaptcha.ready fired.
      if (readyPromiseRef.current) {
        try {
          await readyPromiseRef.current;
        } catch {
          return null;
        }
      }

      const grecaptcha = window.grecaptcha;
      if (!grecaptcha || typeof grecaptcha.execute !== "function") return null;

      try {
        const token = await grecaptcha.execute(siteKey, { action });
        return typeof token === "string" && token.length > 0 ? token : null;
      } catch {
        return null;
      }
    },
    [siteKey],
  );

  const value = useMemo<RecaptchaContextValue>(
    () => ({ getToken }),
    [getToken],
  );

  return (
    <RecaptchaContext.Provider value={value}>
      {children}
    </RecaptchaContext.Provider>
  );
}

/**
 * useRecaptcha
 *
 * Returns `{ getToken }`. If the provider isn't mounted OR if no site key is
 * configured, `getToken` simply resolves to `null` — callers should treat
 * null as "no token available" and let the server decide what to do.
 */
export function useRecaptcha(): RecaptchaContextValue {
  const ctx = useContext(RecaptchaContext);
  return ctx ?? NULL_CONTEXT;
}
