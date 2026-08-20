"use client";

import { useActionState } from "react";
import { startPayoutSetupAction } from "@/lib/payments/actions";
import { AUTH_IDLE } from "@/lib/auth/state";
import { Notice } from "./ui";

/**
 * The one button that connects a seller to Stripe.
 *
 * Three states, and each says what it actually means rather than showing a
 * generic "connect" every time: never started, started but not finished (very
 * common — Stripe asks for identity documents and people come back later),
 * and done.
 */
export function PayoutSetup({
  started,
  enabled,
}: {
  started: boolean;
  enabled: boolean;
}) {
  const [state, action, pending] = useActionState(startPayoutSetupAction, AUTH_IDLE);

  if (enabled) {
    return (
      <Notice tone="brand" title="Your payouts are set up">
        Stripe has everything it needs, so buyers can pay for your listings by
        card and the money settles to your account. You can change your bank
        details any time from the same button below.
        <form action={action} className="mt-3">
          <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>
            {pending ? "Opening Stripe…" : "Open my Stripe settings"}
          </button>
        </form>
      </Notice>
    );
  }

  return (
    <div className="card p-6 lg:p-8">
      <h2 className="display text-xl">
        {started ? "Finish setting up payouts" : "Set up payouts"}
      </h2>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
        {started
          ? "Stripe still needs something from you before it can pay you — usually an identity document or your bank details. Until it has them, buyers cannot pay for your listings by card."
          : "Stripe collects your identity and bank details directly and handles the compliance that comes with them. Buildora never sees your bank details."}
      </p>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[#f4c9c6] bg-[var(--color-danger-tint)] px-3 py-2.5 text-[0.8125rem] text-[var(--color-danger)]"
        >
          {state.message}
        </p>
      ) : null}

      <form action={action} className="mt-5">
        <button type="submit" className="btn btn-brand btn-lg" disabled={pending}>
          {pending
            ? "Opening Stripe…"
            : started
              ? "Continue on Stripe"
              : "Set up payouts with Stripe"}
        </button>
      </form>

      <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        You will be taken to Stripe and returned here when you are done. Nothing
        is charged for this.
      </p>
    </div>
  );
}
