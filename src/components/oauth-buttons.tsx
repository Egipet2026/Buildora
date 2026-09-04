"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Signing in with Google or GitHub.
 *
 * No confirmation code is asked for on this path, and that is not a shortcut:
 * the provider has already established that the person controls the account,
 * and the address they hand back is one they have verified themselves. Asking
 * again would add a step without adding an assurance.
 *
 * Whether either provider works depends on it being enabled in the Supabase
 * project. When it is not, Supabase says so and the message is shown as-is
 * rather than dressed up as a temporary glitch.
 */

type Provider = "google" | "github";

const PROVIDERS: {
  id: Provider;
  label: string;
  /** Supabase names Microsoft's provider "azure"; members do not know that. */
  settingsName: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "google",
    label: "Continue with Google",
    settingsName: "Google",
    icon: (
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z"
        />
        <path
          fill="#FBBC05"
          d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z"
        />
      </svg>
    ),
  },
  {
    id: "github",
    label: "Continue with GitHub",
    settingsName: "GitHub",
    icon: (
  <svg
    viewBox="0 0 24 24"
    className="h-[18px] w-[18px]"
    aria-hidden
    fill="currentColor"
  >
    <path d="M12 .5a12 12 0 0 0-3.79 23.4c.6.11.82-.26.82-.58v-2.03c-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.75.08-.74.08-.74 1.2.09 1.83 1.23 1.83 1.23 1.07 1.83 2.8 1.3 3.48.99.11-.77.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.94 0-1.31.47-2.38 1.23-3.22-.12-.3-.53-1.52.12-3.18 0 0 1-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.29-1.23 3.29-1.23.66 1.66.25 2.88.13 3.18.76.84 1.22 1.91 1.22 3.22 0 4.61-2.8 5.63-5.48 5.93.43.37.81 1.1.81 2.22v3.29c0 .32.22.69.83.57A12 12 0 0 0 12 .5Z" />
  </svg>
),
  },
];

export function OAuthButtons({ mode }: { mode: "login" | "register" }) {
  const [pending, setPending] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start(provider: Provider, settingsName: string) {
    const supabase = getBrowserSupabase();
    if (!supabase) {
      setError(
        "Sign-in with a provider needs a connected database. This deployment is running on sample data.",
      );
      return;
    }

    setPending(provider);
    setError(null);

    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        // The callback route swaps the one-time code for a session cookie.
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (authError) {
      setPending(null);
      setError(
        /not enabled|unsupported/i.test(authError.message)
          ? `${settingsName} is not switched on for this site yet. Enable it in Supabase under Authentication → Providers.`
          : authError.message,
      );
    }
    // On success the browser leaves for the provider; nothing else to do.
  }

  return (
    <div className="space-y-3">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => start(p.id, p.settingsName)}
          disabled={pending !== null}
          className="btn btn-outline btn-lg w-full justify-center gap-3 disabled:opacity-60"
        >
          {p.icon}
          {pending === p.id ? "Opening…" : p.label}
        </button>
      ))}

      {error ? (
        <p
          role="alert"
          className="rounded-lg border border-[#f4c9c6] bg-[var(--color-danger-tint)] px-3 py-2.5 text-[0.8125rem] leading-relaxed text-[var(--color-danger)]"
        >
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-[var(--color-line)]" />
        <span className="text-[0.75rem] text-[var(--color-ink-3)]">
          or {mode === "register" ? "sign up" : "sign in"} with an email or phone
        </span>
        <span className="h-px flex-1 bg-[var(--color-line)]" />
      </div>
    </div>
  );
}
