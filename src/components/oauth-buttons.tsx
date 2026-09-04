"use client";

import { useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Signing in with Google or Microsoft.
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
    id: "azure",
    label: "Continue with Microsoft",
    settingsName: "Azure (Microsoft)",
    icon: (
      <svg viewBox="0 0 18 18" className="h-[18px] w-[18px]" aria-hidden>
        <path fill="#F25022" d="M0 0h8.5v8.5H0z" />
        <path fill="#7FBA00" d="M9.5 0H18v8.5H9.5z" />
        <path fill="#00A4EF" d="M0 9.5h8.5V18H0z" />
        <path fill="#FFB900" d="M9.5 9.5H18V18H9.5z" />
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
