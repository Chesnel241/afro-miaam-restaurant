"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthContext";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [subscribeNewsletter, setSubscribeNewsletter] = useState(true);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { loginWithEmail, signUpWithEmail, loginWithGoogle, user } = useAuth();
  const router = useRouter();

  // Si déjà connecté, rediriger (en effet, hors render, pour éviter le warning
  // React "Cannot update a component while rendering" et la double navigation).
  useEffect(() => {
    if (user) {
      router.replace(user.role === "admin" ? "/admin" : "/mon-compte");
    }
  }, [user, router]);

  if (user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "signup") {
        if (password.length < 6) {
          setError("Le mot de passe doit contenir au moins 6 caractères.");
          setBusy(false);
          return;
        }
        await signUpWithEmail(email, password, name || email.split("@")[0], phone, subscribeNewsletter);
      } else {
        await loginWithEmail(email, password);
      }
      // La redirection sera faite par le useEffect dans les pages cibles
      // via onAuthStateChanged → user state change
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || "";
      switch (code) {
        case "auth/email-already-in-use":
          setError("Cet email est déjà utilisé. Connectez-vous plutôt.");
          break;
        case "auth/invalid-credential":
        case "auth/wrong-password":
        case "auth/user-not-found":
          setError("Email ou mot de passe incorrect.");
          break;
        case "auth/weak-password":
          setError("Le mot de passe doit contenir au moins 6 caractères.");
          break;
        case "auth/invalid-email":
          setError("Adresse email invalide.");
          break;
        default:
          setError("Une erreur est survenue. Réessayez.");
          console.error("GOOGLE_LOGIN_FAILED", code || "unknown");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setBusy(true);
    try {
      // Full-page redirect to /api/auth/oauth/google/start — control leaves
      // the page, so the code below only runs if the redirect itself fails.
      await loginWithGoogle();
    } catch (err: unknown) {
      setError("Connexion Google indisponible pour le moment. Réessayez.");
      console.error("GOOGLE_OAUTH_START_FAILED", (err as { message?: string })?.message || "unknown");
      setBusy(false);
    }
  };

  return (
    <div className="container-x py-16 sm:py-24">
      <div className="mx-auto max-w-md rounded-2xl bg-creamSoft p-8 shadow-soft">
        <h1 className="heading-display text-center text-3xl text-primary">
          {mode === "login" ? "Connexion" : "Créer un compte"}
        </h1>
        <p className="mt-4 text-center text-sm text-primary/75">
          {mode === "login"
            ? "Connectez-vous pour accéder à votre espace fidélité et vos commandes."
            : "Créez votre compte pour profiter de notre programme de fidélité."}
        </p>

        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-center text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-8 grid gap-5">
          {mode === "signup" && (
            <>
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-primary">
                  Votre prénom
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent"
                  placeholder="Ex: Fatou"
                />
              </div>
              <div>
                <label htmlFor="phone" className="block text-sm font-bold text-primary">
                  Téléphone
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent"
                  placeholder="06 12 34 56 78"
                  required
                />
              </div>
            </>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-bold text-primary">
              Adresse E-mail
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent"
              placeholder="votre@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-bold text-primary">
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 block w-full rounded-md border-0 bg-white px-4 py-3 text-primary shadow-sm ring-1 ring-inset ring-cream/20 focus:ring-2 focus:ring-inset focus:ring-accent"
              placeholder={mode === "signup" ? "Minimum 6 caractères" : "Votre mot de passe"}
              required
              minLength={6}
            />
          </div>

          {mode === "signup" && (
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="newsletter"
                checked={subscribeNewsletter}
                onChange={(e) => setSubscribeNewsletter(e.target.checked)}
                className="mt-1 h-4 w-4 rounded border-cream/20 text-accent focus:ring-accent"
              />
              <label htmlFor="newsletter" className="text-sm text-primary/80 leading-snug">
                Je souhaite recevoir les offres et la newsletter d&apos;Afro Miaam
              </label>
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="btn btn-lg btn-primary justify-center disabled:opacity-50"
          >
            {busy ? "Chargement…" : mode === "login" ? "Se connecter" : "Créer mon compte"}
          </button>
        </form>

        {/* Séparateur */}
        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-cream/30" />
          <span className="text-xs text-primary/50">ou</span>
          <div className="h-px flex-1 bg-cream/30" />
        </div>

        {/* Google */}
        <button
          onClick={handleGoogle}
          disabled={busy}
          className="mt-4 flex w-full items-center justify-center gap-3 rounded-md bg-white px-4 py-3 text-sm font-semibold text-primary shadow-sm ring-1 ring-inset ring-cream/20 transition hover:bg-cream/50 disabled:opacity-50"
        >
          {busy ? (
            <>
              <svg className="h-5 w-5 animate-spin text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Redirection...
            </>
          ) : (
            <>
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              Continuer avec Google
            </>
          )}
        </button>

        {/* Basculer login / signup */}
        <div className="mt-6 text-center text-sm text-primary/70">
          {mode === "login" ? (
            <>
              Pas encore de compte ?{" "}
              <button
                onClick={() => { setMode("signup"); setError(""); }}
                className="font-bold text-accent underline underline-offset-2"
              >
                Créer un compte
              </button>
            </>
          ) : (
            <>
              Déjà un compte ?{" "}
              <button
                onClick={() => { setMode("login"); setError(""); }}
                className="font-bold text-accent underline underline-offset-2"
              >
                Se connecter
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
