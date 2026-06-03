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
 * AuthContext — JWT-based client auth layer.
 *
 * The server exposes:
 *  - POST /api/auth/signup
 *  - POST /api/auth/login
 *  - POST /api/auth/logout
 *  - POST /api/auth/refresh   (reads HttpOnly cookie `afro_session`)
 *  - GET  /api/auth/me        (Bearer)
 *  - PATCH /api/user/me       (Bearer)
 *  - DELETE /api/user/me      (Bearer)
 *  - GET  /api/auth/oauth/google/start
 *  - GET  /api/admin/users    (Bearer, admin only)
 *  - GET  /api/admin/newsletter (Bearer, admin only)
 *
 * Token strategy:
 *  - The refresh token lives in an HttpOnly cookie set by the server. We can't
 *    read it. The access token (1h JWT) is kept in MODULE-LEVEL memory only,
 *    NEVER in localStorage (XSS protection). We refresh it ~5 min before expiry.
 *
 * Public API preserved from the Firebase-era for compatibility:
 *  - user, loading
 *  - loginWithEmail(email, password, recaptchaToken?)
 *  - signUpWithEmail(email, password, name, phone, subscribeNewsletter?, referralCode?, recaptchaToken?)
 *  - loginWithGoogle()
 *  - logout()
 *  - updateProfile(data)
 *  - deleteAccount()
 *  - allCustomers, newsletterSubscribers (admin-only, polled every 30s)
 *
 * New API surfaced for the rewritten OrderContext / MenuContext / SettingsContext
 * (all parallel agents):
 *  - signIn(email, password, recaptchaToken?)      — alias of loginWithEmail
 *  - signUp({ email, password, name, phone, referralCode, subscribeNewsletter, recaptchaToken })
 *  - signInWithGoogle()                            — alias of loginWithGoogle
 *  - signOut()                                     — alias of logout
 *  - authFetch(url, init?)                         — adds Bearer + auto-refresh on 401
 */

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type UserRole = "customer" | "admin" | "deleted";

export type UserProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  ordersCount: number;
  isFirstLogin?: boolean;
  referralCode?: string;
  referralCredits?: number;
  hasUsedWelcomeOffer?: boolean;
  referredBy?: string;
  createdAt?: string | Date;
  image?: string;
  subscribeNewsletter?: boolean;
  emailVerified?: boolean;
};

export type NewsletterSubscriber = {
  id: string;
  email: string;
  createdAt: string;
  source: string;
};

export type SignUpInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  referralCode?: string;
  subscribeNewsletter?: boolean;
  recaptchaToken?: string | null;
};

type AuthContextType = {
  user: UserProfile | null;
  loading: boolean;

  // Preserved (Firebase-era) names — DO NOT rename, many pages import these.
  loginWithEmail: (email: string, password: string, recaptchaToken?: string | null) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name: string,
    phone: string,
    subscribeNewsletter?: boolean,
  ) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  deleteAccount: () => Promise<void>;

  // New names (clean API for the rewritten contexts/pages).
  signIn: (email: string, password: string, recaptchaToken?: string | null) => Promise<void>;
  signUp: (input: SignUpInput) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Shared helper — bearer-token fetch with 401 retry-after-refresh.
  authFetch: (url: string, init?: RequestInit) => Promise<Response>;

  // Admin-only data (replaces Firestore snapshots).
  allCustomers: UserProfile[];
  newsletterSubscribers: NewsletterSubscriber[];
};

// -----------------------------------------------------------------------------
// In-memory access token
// -----------------------------------------------------------------------------
//
// Module-scoped (NOT React state) so that:
//  - useEffect-driven refreshes don't trigger re-renders just to bump the token,
//  - authFetch can be called from anywhere via the context without React state.
//
// Trade-off: HMR may reset this between edits in dev. That's fine — the next
// refresh call will repopulate it from the HttpOnly cookie.

let accessToken: string | null = null;

function getAccessToken(): string | null {
  return accessToken;
}

function setAccessToken(token: string | null): void {
  accessToken = token;
}

// -----------------------------------------------------------------------------
// Server response normalization (snake_case → camelCase)
// -----------------------------------------------------------------------------
//
// /api/auth/login, /signup, /refresh return a minimal user with snake_case
// keys. /api/auth/me returns the full profile in snake_case. We normalize at
// the boundary so the rest of the app uses camelCase exclusively.

type RawUser = {
  id?: string;
  email?: string;
  name?: string;
  role?: UserRole;
  email_verified?: boolean;
  emailVerified?: boolean;
  referral_code?: string;
  referralCode?: string;
  referral_credits?: number | string;
  referralCredits?: number | string;
  has_used_welcome_offer?: boolean;
  hasUsedWelcomeOffer?: boolean;
  orders_count?: number;
  ordersCount?: number;
  is_first_login?: boolean;
  isFirstLogin?: boolean;
  phone?: string | null;
  image?: string | null;
  subscribe_newsletter?: boolean;
  subscribeNewsletter?: boolean;
  referred_by?: string | null;
  referredBy?: string | null;
  created_at?: string | Date | null;
  createdAt?: string | Date | null;
};

function normalizeUser(raw: RawUser | null | undefined): UserProfile | null {
  if (!raw || !raw.id || !raw.email) return null;
  const credits = raw.referralCredits ?? raw.referral_credits;
  return {
    id: raw.id,
    email: raw.email,
    name: raw.name ?? "",
    role: (raw.role ?? "customer") as UserRole,
    phone: raw.phone ?? undefined,
    image: raw.image ?? undefined,
    emailVerified: raw.emailVerified ?? raw.email_verified ?? false,
    referralCode: raw.referralCode ?? raw.referral_code ?? "",
    referralCredits: credits === undefined || credits === null ? 0 : Number(credits),
    hasUsedWelcomeOffer: raw.hasUsedWelcomeOffer ?? raw.has_used_welcome_offer ?? false,
    ordersCount: raw.ordersCount ?? raw.orders_count ?? 0,
    isFirstLogin: raw.isFirstLogin ?? raw.is_first_login ?? false,
    referredBy: raw.referredBy ?? raw.referred_by ?? undefined,
    subscribeNewsletter:
      raw.subscribeNewsletter ?? raw.subscribe_newsletter ?? false,
    createdAt: raw.createdAt ?? raw.created_at ?? undefined,
  };
}

async function readJson<T = unknown>(res: Response): Promise<T | null> {
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

function extractError(payload: unknown): string {
  if (payload && typeof payload === "object" && "error" in payload) {
    const e = (payload as { error: unknown }).error;
    if (typeof e === "string" && e.trim().length > 0) return e;
  }
  return "";
}

// -----------------------------------------------------------------------------
// Context
// -----------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const REFRESH_INTERVAL_MS = 55 * 60 * 1000; // 55 min (tokens last 1h)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [allCustomers, setAllCustomers] = useState<UserProfile[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<NewsletterSubscriber[]>([]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // We use a ref for the "in-flight refresh" promise so concurrent 401s
  // collapse into a single refresh round-trip.
  const inFlightRefreshRef = useRef<Promise<boolean> | null>(null);

  // ---------------------------------------------------------------------------
  // Token refresh
  // ---------------------------------------------------------------------------

  const clearRefreshTimer = useCallback(() => {
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  }, []);

  const scheduleRefresh = useCallback(() => {
    clearRefreshTimer();
    refreshTimerRef.current = setTimeout(() => {
      // The handler reads the latest closure via refRefresh below.
      // We schedule, then call refresh inside a microtask.
      void refreshAccessTokenRef.current?.();
    }, REFRESH_INTERVAL_MS);
  }, [clearRefreshTimer]);

  // `refreshAccessToken` may be called from inside a setTimeout that captures
  // an older version. We funnel through a ref to always invoke the latest.
  const refreshAccessTokenRef = useRef<(() => Promise<boolean>) | null>(null);

  const refreshAccessToken = useCallback(async (): Promise<boolean> => {
    if (inFlightRefreshRef.current) {
      return inFlightRefreshRef.current;
    }
    const p = (async (): Promise<boolean> => {
      try {
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) {
          setAccessToken(null);
          setUser(null);
          clearRefreshTimer();
          return false;
        }
        const data = (await readJson<{
          ok?: boolean;
          accessToken?: string;
          user?: RawUser;
        }>(res)) ?? {};
        if (!data.ok || !data.accessToken) {
          setAccessToken(null);
          setUser(null);
          clearRefreshTimer();
          return false;
        }
        setAccessToken(data.accessToken);
        const u = normalizeUser(data.user);
        // The minimal user returned by /refresh lacks orders_count etc. Pull
        // the full profile from /me so the UI has everything it needs.
        if (u) {
          setUser(u);
          // Fire-and-forget hydration; UI doesn't block on it.
          void hydrateUserFromMe();
        }
        scheduleRefresh();
        return true;
      } catch {
        setAccessToken(null);
        setUser(null);
        clearRefreshTimer();
        return false;
      } finally {
        inFlightRefreshRef.current = null;
      }
    })();
    inFlightRefreshRef.current = p;
    return p;
  }, [clearRefreshTimer, scheduleRefresh]);

  refreshAccessTokenRef.current = refreshAccessToken;

  // ---------------------------------------------------------------------------
  // authFetch — Bearer-token fetch with one retry after refresh on 401.
  // ---------------------------------------------------------------------------

  const authFetch = useCallback(
    async (url: string, init: RequestInit = {}): Promise<Response> => {
      const buildHeaders = (token: string | null): Headers => {
        const h = new Headers(init.headers || {});
        if (token) h.set("Authorization", `Bearer ${token}`);
        return h;
      };

      const doFetch = (token: string | null): Promise<Response> =>
        fetch(url, {
          ...init,
          headers: buildHeaders(token),
          credentials: init.credentials ?? "include",
        });

      let res = await doFetch(getAccessToken());

      if (res.status === 401) {
        const ok = await refreshAccessToken();
        if (ok) {
          res = await doFetch(getAccessToken());
        }
      }

      return res;
    },
    [refreshAccessToken],
  );

  // ---------------------------------------------------------------------------
  // /api/auth/me — hydrate full profile
  // ---------------------------------------------------------------------------

  const hydrateUserFromMe = useCallback(async (): Promise<void> => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        credentials: "include",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = (await readJson<{ ok?: boolean; user?: RawUser }>(res)) ?? {};
      const u = normalizeUser(data.user);
      if (u) setUser(u);
    } catch {
      // ignore — best-effort hydration
    }
  }, []);

  // ---------------------------------------------------------------------------
  // Bootstrap on mount: try to refresh from the HttpOnly cookie.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const ok = await refreshAccessToken();
      if (!cancelled) {
        if (!ok) {
          setUser(null);
        }
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      clearRefreshTimer();
    };
    // refreshAccessToken / clearRefreshTimer are stable via useCallback.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------------------------------------------------------------------------
  // Admin polling — /api/admin/users + /api/admin/newsletter every 30s.
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!user || user.role !== "admin") {
      setAllCustomers([]);
      setNewsletterSubscribers([]);
      return;
    }

    let cancelled = false;

    const fetchCustomers = async () => {
      try {
        const res = await authFetch("/api/admin/users");
        if (!res.ok) return;
        const data = (await readJson<{ ok?: boolean; users?: RawUser[] }>(res)) ?? {};
        if (cancelled || !data.users) return;
        const mapped = data.users
          .map((row) => normalizeUser(row))
          .filter((u): u is UserProfile => u !== null);
        setAllCustomers(mapped);
      } catch {
        // ignore transient errors; next poll will retry
      }
    };

    const fetchNewsletter = async () => {
      try {
        const res = await authFetch("/api/admin/newsletter");
        if (!res.ok) return;
        const data =
          (await readJson<{
            ok?: boolean;
            subscribers?: {
              id?: string;
              email?: string;
              source?: string | null;
              createdAt?: string | Date | null;
            }[];
          }>(res)) ?? {};
        if (cancelled || !data.subscribers) return;
        const mapped: NewsletterSubscriber[] = data.subscribers
          .filter((s) => typeof s.id === "string" && typeof s.email === "string")
          .map((s) => {
            const raw = s.createdAt;
            let dateStr: string;
            if (!raw) {
              dateStr = new Date().toISOString().split("T")[0];
            } else {
              const d = raw instanceof Date ? raw : new Date(raw);
              dateStr = isNaN(d.getTime())
                ? new Date().toISOString().split("T")[0]
                : d.toISOString().split("T")[0];
            }
            return {
              id: s.id as string,
              email: s.email as string,
              createdAt: dateStr,
              source: s.source ?? "inconnu",
            };
          });
        setNewsletterSubscribers(mapped);
      } catch {
        // ignore
      }
    };

    // Initial fetch + 30s polling.
    void fetchCustomers();
    void fetchNewsletter();
    const interval = setInterval(() => {
      void fetchCustomers();
      void fetchNewsletter();
    }, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user, authFetch]);

  // ---------------------------------------------------------------------------
  // signIn / signUp / signOut / etc.
  // ---------------------------------------------------------------------------

  const completeAuthSuccess = useCallback(
    (accessTokenFromServer: string, rawUser: RawUser | undefined) => {
      setAccessToken(accessTokenFromServer);
      const u = normalizeUser(rawUser);
      if (u) setUser(u);
      scheduleRefresh();
      // Also hydrate the full profile (ordersCount, image, etc.) from /me.
      void hydrateUserFromMe();
    },
    [hydrateUserFromMe, scheduleRefresh],
  );

  const signIn = useCallback(
    async (email: string, password: string, recaptchaToken?: string | null) => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          password,
          recaptchaToken: recaptchaToken ?? undefined,
        }),
      });
      const data = (await readJson<{
        ok?: boolean;
        accessToken?: string;
        user?: RawUser;
        error?: string;
      }>(res)) ?? {};
      if (!res.ok || !data.ok || !data.accessToken) {
        const err = new Error(extractError(data) || "AUTH_FAILED");
        // Attach status so the login page can produce friendly French strings.
        (err as Error & { status?: number; code?: string }).status = res.status;
        (err as Error & { status?: number; code?: string }).code =
          extractError(data) || `HTTP_${res.status}`;
        throw err;
      }
      completeAuthSuccess(data.accessToken, data.user);
    },
    [completeAuthSuccess],
  );

  const signUp = useCallback(
    async (input: SignUpInput) => {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: input.email.trim().toLowerCase(),
          password: input.password,
          name: input.name,
          phone: input.phone || undefined,
          referralCode: input.referralCode || undefined,
          subscribeNewsletter: input.subscribeNewsletter === true,
          recaptchaToken: input.recaptchaToken ?? undefined,
        }),
      });
      const data = (await readJson<{
        ok?: boolean;
        accessToken?: string;
        user?: RawUser;
        error?: string;
      }>(res)) ?? {};
      if (!res.ok || !data.ok || !data.accessToken) {
        const err = new Error(extractError(data) || "SIGNUP_FAILED");
        (err as Error & { status?: number; code?: string }).status = res.status;
        (err as Error & { status?: number; code?: string }).code =
          extractError(data) || `HTTP_${res.status}`;
        throw err;
      }
      completeAuthSuccess(data.accessToken, data.user);
    },
    [completeAuthSuccess],
  );

  // Legacy Firebase-era signature kept for compatibility with /login page +
  // any other caller still using the positional form.
  const loginWithEmail = useCallback(
    async (email: string, password: string, recaptchaToken?: string | null) => {
      await signIn(email, password, recaptchaToken);
    },
    [signIn],
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      name: string,
      phone: string,
      subscribeNewsletter = false,
    ) => {
      await signUp({ email, password, name, phone, subscribeNewsletter });
    },
    [signUp],
  );

  const signInWithGoogle = useCallback(async () => {
    if (typeof window !== "undefined") {
      window.location.href = "/api/auth/oauth/google/start";
    }
  }, []);

  const loginWithGoogle = signInWithGoogle;

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // We still proceed to clear local state even if the network call failed.
    }
    setAccessToken(null);
    setUser(null);
    setAllCustomers([]);
    setNewsletterSubscribers([]);
    clearRefreshTimer();
  }, [clearRefreshTimer]);

  const logout = signOut;

  const updateProfile = useCallback(
    async (data: Partial<UserProfile>) => {
      const payload: Record<string, unknown> = {};
      if (data.name !== undefined) payload.name = data.name;
      if (data.phone !== undefined) payload.phone = data.phone;
      if (data.image !== undefined) payload.image = data.image;
      if (data.subscribeNewsletter !== undefined)
        payload.subscribeNewsletter = data.subscribeNewsletter;
      // isFirstLogin is consumed by WelcomeNotification — the server marks
      // it false automatically after first login completes, but we let the
      // client set it explicitly via the same endpoint when needed.
      if (data.isFirstLogin !== undefined)
        payload.isFirstLogin = data.isFirstLogin;

      const res = await authFetch("/api/user/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await readJson<{ error?: string }>(res)) ?? {};
        throw new Error(extractError(body) || "UPDATE_FAILED");
      }
      const body = (await readJson<{ ok?: boolean; user?: RawUser }>(res)) ?? {};
      const u = normalizeUser(body.user);
      if (u) {
        setUser(u);
      } else {
        // Fallback: merge optimistic update into existing state.
        setUser((prev) => (prev ? { ...prev, ...data } : prev));
      }
    },
    [authFetch],
  );

  const deleteAccount = useCallback(async () => {
    const res = await authFetch("/api/user/me", { method: "DELETE" });
    if (!res.ok) {
      const body = (await readJson<{ error?: string }>(res)) ?? {};
      throw new Error(extractError(body) || "DELETE_FAILED");
    }
    // Server-side soft-delete is done — clear local session.
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {
      // ignore
    }
    setAccessToken(null);
    setUser(null);
    setAllCustomers([]);
    setNewsletterSubscribers([]);
    clearRefreshTimer();
  }, [authFetch, clearRefreshTimer]);

  // ---------------------------------------------------------------------------
  // Context value
  // ---------------------------------------------------------------------------

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      loading,
      loginWithEmail,
      signUpWithEmail,
      loginWithGoogle,
      logout,
      updateProfile,
      deleteAccount,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      authFetch,
      allCustomers,
      newsletterSubscribers,
    }),
    [
      user,
      loading,
      loginWithEmail,
      signUpWithEmail,
      loginWithGoogle,
      logout,
      updateProfile,
      deleteAccount,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      authFetch,
      allCustomers,
      newsletterSubscribers,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
  }
  return ctx;
}

// Re-export RecaptchaProvider/useRecaptcha so callers can do
//   import { RecaptchaProvider, useRecaptcha } from "@/components/AuthContext";
// without changing layout wiring. The lead will mount <RecaptchaProvider> from
// app/layout.tsx in a later phase; in the meantime useRecaptcha() returns a
// safe no-op (resolves to null) when the provider isn't mounted.
export { RecaptchaProvider, useRecaptcha } from "./RecaptchaProvider";
