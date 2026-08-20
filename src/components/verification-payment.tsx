"use client";

import { useActionState } from "react";
import { startVerificationPaymentAction } from "@/lib/payments/actions";
import { IDLE } from "@/lib/action-state";

/**
 * Paying the verification fee.
 *
 * Deliberately separate from the evidence form. Paying does not submit
 * anything and submitting does not charge anything, because the two failing
 * together would be worse than either failing alone — a fee taken for a
 * request that never arrived is the kind of thing people rightly get angry
 * about.
 */
export function VerificationPayment({ price }: { price: string }) {
  const [state, action, pending] = useActionState(
    startVerificationPaymentAction,
    IDLE,
  );

  return (
    <form action={action} className="card p-6">
      <p className="eyebrow mb-2">Verification fee</p>
      <p className="display text-2xl">{price}</p>
      <p className="mt-3 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
        One-off, per account. It pays for the checks themselves and is not
        refunded if the checks do not support what was claimed — a check that
        only costs money when it agrees with you is not a check.
      </p>

      {state.message && !state.ok ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-[#f4c9c6] bg-[var(--color-danger-tint)] px-3 py-2.5 text-[0.8125rem] text-[var(--color-danger)]"
        >
          {state.message}
        </p>
      ) : null}

      <button type="submit" className="btn btn-brand mt-5 w-full" disabled={pending}>
        {pending ? "Opening Stripe…" : "Pay the verification fee"}
      </button>
    </form>
  );
}
