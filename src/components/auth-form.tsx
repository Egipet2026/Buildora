"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Field, Notice } from "./ui";
import { getBrowserSupabase } from "@/lib/supabase/client";

/**
 * Email + password auth against Supabase. In demo mode there is no auth
 * provider, so the form explains that and points at the seeded account which
 * is already "signed in".
 */
export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const supabase = getBrowserSupabase();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  if (!supabase) {
    return (
      <div className="space-y-5">
        <Notice tone="brand" title="Demo mode — no sign-in required">
          This deployment has no Supabase credentials configured, so it runs on
          seeded sample data with a demo account already signed in. Every
          authenticated surface — dashboards, offers, messaging, admin — is
          browsable right now.
        </Notice>

        <div className="card p-6">
          <h2 className="text-[0.9375rem] font-semibold">
            To enable real accounts
          </h2>
          <ol className="mt-4 space-y-3">
            {[
              "Create a Supabase project",
              "Run supabase/migrations/0001_init.sql against it",
              "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
              "Restart — authentication, storage and realtime activate automatically",
            ].map((step, i) => (
              <li key={step} className="flex gap-3">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[0.6875rem] font-bold">
                  {i + 1}
                </span>
                <span className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                  {step}
                </span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex gap-3">
          <Link href="/dashboard" className="btn btn-brand flex-1">
            Go to the dashboard
          </Link>
          <Link href="/marketplace" className="btn btn-outline flex-1">
            Browse listings
          </Link>
        </div>
      </div>
    );
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "");
    const password = String(data.get("password") ?? "");
    const fullName = String(data.get("fullName") ?? "");

    try {
      if (mode === "register") {
        const { error } = await supabase!.auth.signUp({
          email,
          password,
          options: {
            data: { full_name: fullName },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setSent(true);
      } else {
        const { error } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/dashboard");
        router.refresh();
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setPending(false);
    }
  }

  if (sent) {
    return (
      <Notice tone="brand" title="Check your inbox">
        We sent a confirmation link to your email address. Open it to finish
        creating your account.
      </Notice>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6 lg:p-8">
      {mode === "register" ? (
        <Field label="Full name" htmlFor="fullName" required>
          <input
            id="fullName"
            name="fullName"
            className="input"
            autoComplete="name"
            required
          />
        </Field>
      ) : null}

      <Field label="Email" htmlFor="email" required>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
        />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        hint={mode === "register" ? "At least 8 characters." : undefined}
        required
      >
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          minLength={8}
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
        />
      </Field>

      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : null}

      <button type="submit" className="btn btn-brand w-full" disabled={pending}>
        {pending
          ? "Working…"
          : mode === "register"
            ? "Create account"
            : "Sign in"}
      </button>

      <p className="text-center text-[0.8125rem] text-[var(--color-ink-3)]">
        {mode === "register" ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-[var(--color-brand)] hover:underline">
              Sign in
            </Link>
          </>
        ) : (
          <>
            New to BizHub?{" "}
            <Link
              href="/register"
              className="font-medium text-[var(--color-brand)] hover:underline"
            >
              Create an account
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
