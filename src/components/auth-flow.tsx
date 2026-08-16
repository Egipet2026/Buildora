"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { Field, Notice } from "./ui";
import { loginAction, registerAction, verifyCodeAction } from "@/lib/auth/actions";
import { AUTH_IDLE, type AuthState } from "@/lib/auth/state";
import {
  DEFAULT_DIAL_CODE,
  DIAL_CODES,
  type AuthChannel,
} from "@/lib/auth/identity";

type Mode = "login" | "register";

export function AuthFlow({ mode }: { mode: Mode }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    mode === "register" ? registerAction : loginAction,
    AUTH_IDLE,
  );

  // Passing the credentials step hands everything the code step needs over to
  // it; from there the code step owns its own state so one action drives it.
  const [verifyContext, setVerifyContext] = useState<AuthState | null>(null);

  useEffect(() => {
    if (state.ok && state.step === "verify") setVerifyContext(state);
  }, [state]);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  if (verifyContext) {
    return (
      <VerifyStep
        context={verifyContext}
        onBack={() => setVerifyContext(null)}
      />
    );
  }

  return (
    <CredentialsStep mode={mode} state={state} action={action} pending={pending} />
  );
}

/* --------------------------------------------------------- step 1: details */

function CredentialsStep({
  mode,
  state,
  action,
  pending,
}: {
  mode: Mode;
  state: AuthState;
  action: (formData: FormData) => void;
  pending: boolean;
}) {
  const [method, setMethod] = useState<AuthChannel>("email");
  const err = state.errors ?? {};

  return (
    <form action={action} className="card space-y-5 p-6 lg:p-8">
      <input type="hidden" name="method" value={method} />

      <div>
        <span className="field-label">How do you want to sign {mode === "register" ? "up" : "in"}?</span>
        <div
          role="tablist"
          aria-label="Sign-in method"
          className="grid grid-cols-2 gap-2"
        >
          {(
            [
              ["email", "Email", "✉"],
              ["phone", "Phone number", "☎"],
            ] as const
          ).map(([value, label, icon]) => (
            <button
              key={value}
              type="button"
              role="tab"
              aria-selected={method === value}
              onClick={() => setMethod(value)}
              className={`flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-[0.875rem] font-medium transition-colors ${
                method === value
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)] text-[var(--color-brand-dark)]"
                  : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-3)]"
              }`}
            >
              <span aria-hidden>{icon}</span>
              {label}
            </button>
          ))}
        </div>
      </div>

      {mode === "register" ? (
        <Field label="Full name" htmlFor="fullName" error={err.fullName} required>
          <input
            id="fullName"
            name="fullName"
            className="input"
            autoComplete="name"
            required
          />
        </Field>
      ) : null}

      {method === "email" ? (
        <Field label="Email address" htmlFor="email" error={err.email} required>
          <input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            className="input"
            autoComplete="email"
            placeholder="you@company.com"
            required
          />
        </Field>
      ) : (
        <Field
          label="Phone number"
          htmlFor="phone"
          error={err.phone}
          hint="Without the leading zero — we add the country code for you."
          required
        >
          <div className="flex gap-2">
            <select
              name="dialCode"
              defaultValue={DEFAULT_DIAL_CODE}
              className="select w-32 shrink-0"
              aria-label="Country dialling code"
            >
              {DIAL_CODES.map((d) => (
                <option key={`${d.country}${d.code}`} value={d.code}>
                  {d.flag} {d.code}
                </option>
              ))}
            </select>
            <input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              className="input"
              autoComplete="tel-national"
              placeholder="888 123 456"
              required
            />
          </div>
        </Field>
      )}

      <Field
        label="Password"
        htmlFor="password"
        error={err.password}
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

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="rounded-lg border border-[#f4c9c6] bg-[var(--color-danger-tint)] px-3 py-2.5 text-[0.8125rem] text-[var(--color-danger)]"
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-brand btn-lg w-full" disabled={pending}>
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
            New to Bizora?{" "}
            <Link href="/register" className="font-medium text-[var(--color-brand)] hover:underline">
              Create an account
            </Link>
          </>
        )}
      </p>

      {mode === "register" ? (
        <p className="text-center text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
          By creating an account you accept the{" "}
          <Link href="/legal/terms" className="underline">Terms of Service</Link>,{" "}
          <Link href="/legal/marketplace-rules" className="underline">Marketplace Rules</Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline">Privacy Policy</Link>.
        </p>
      ) : null}
    </form>
  );
}

/* ------------------------------------------------------------ step 2: code */

function VerifyStep({
  context,
  onBack,
}: {
  context: AuthState;
  onBack: () => void;
}) {
  const router = useRouter();
  // Confirming and resending are one action distinguished by `intent`, so both
  // write to the same state instead of overwriting each other's message.
  const [state, action, pending] = useActionState(verifyCodeAction, context);
  const [intent, setIntent] = useState<"verify" | "resend">("verify");

  const channel = state.channel ?? context.channel ?? "email";
  const destination = state.destination ?? context.destination ?? "";
  const masked = state.maskedDestination ?? context.maskedDestination ?? "";
  const purpose = state.purpose ?? context.purpose ?? "signup";
  const demoCode = state.demoCode;

  const seconds = useCountdown(state.resendAvailableAt);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.focus(), []);

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="card space-y-6 p-6 lg:p-8">
      <div>
        <button
          type="button"
          onClick={onBack}
          className="mb-4 text-[0.8125rem] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
        >
          ← Back
        </button>
        <h2 className="display text-2xl">Enter your code</h2>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
          We sent a 6-digit code to{" "}
          <strong className="font-semibold text-[var(--color-ink)]">{masked}</strong>. It
          expires in 10 minutes.
        </p>
      </div>

      {demoCode ? (
        <Notice tone="brand" title="Nothing was actually sent">
          This deployment has no {channel === "email" ? "email" : "SMS"} provider
          configured, so the code is shown here instead of being delivered. Your
          code is{" "}
          <strong className="font-mono text-base tracking-widest">{demoCode}</strong>.
          <span className="mt-2 block text-[0.75rem]">
            To send it for real, set{" "}
            <code className="font-mono">
              {channel === "email" ? "RESEND_API_KEY" : "TWILIO_ACCOUNT_SID"}
            </code>{" "}
            in the environment — see the README.
          </span>
        </Notice>
      ) : null}

      <form action={action} className="space-y-4">
        <input type="hidden" name="destination" value={destination} />
        <input type="hidden" name="channel" value={channel} />
        <input type="hidden" name="purpose" value={purpose} />

        <div>
          <label className="field-label" htmlFor="code">
            6-digit code
          </label>
          <input
            ref={inputRef}
            id="code"
            name="code"
            className="input text-center font-mono text-2xl tracking-[0.5em]"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]*"
            maxLength={6}
            placeholder="••••••"
            required
          />
          {state.errors?.code ? (
            <p className="field-error">{state.errors.code}</p>
          ) : null}
        </div>

        {state.message ? (
          <p
            role="status"
            className={`rounded-lg border px-3 py-2.5 text-[0.8125rem] ${
              state.ok
                ? "border-[#ccd7fb] bg-[var(--color-brand-tint)] text-[var(--color-brand-dark)]"
                : "border-[#f4c9c6] bg-[var(--color-danger-tint)] text-[var(--color-danger)]"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        {/* The submitter carries the intent, so the confirm button must come
            first — it is what Enter in the code field triggers. */}
        <button
          type="submit"
          name="intent"
          value="verify"
          onClick={() => setIntent("verify")}
          className="btn btn-brand btn-lg w-full"
          disabled={pending}
        >
          {pending && intent === "verify" ? "Checking…" : "Confirm and continue"}
        </button>

        <p className="text-center">
          <button
            type="submit"
            name="intent"
            value="resend"
            formNoValidate
            onClick={() => setIntent("resend")}
            disabled={pending || seconds > 0}
            className="text-[0.8125rem] font-medium text-[var(--color-brand)] hover:underline disabled:text-[var(--color-ink-3)] disabled:no-underline"
          >
            {seconds > 0
              ? `Request a new code in ${seconds}s`
              : pending && intent === "resend"
                ? "Sending…"
                : "Didn't get it? Send a new code"}
          </button>
        </p>
      </form>
    </div>
  );
}

/** Seconds remaining until a timestamp, ticking down to zero. */
function useCountdown(target?: number): number {
  const [left, setLeft] = useState(() =>
    target ? Math.max(0, Math.ceil((target - Date.now()) / 1000)) : 0,
  );

  useEffect(() => {
    if (!target) {
      setLeft(0);
      return;
    }
    const tick = () =>
      setLeft(Math.max(0, Math.ceil((target - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [target]);

  return left;
}
