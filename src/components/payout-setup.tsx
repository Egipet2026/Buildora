"use client";

import { useActionState } from "react";
import { startPayoutSetupAction } from "@/lib/payments/actions";
import { STRIPE_CONNECT_COUNTRIES } from "@/lib/payments/checkout";
import { AUTH_IDLE } from "@/lib/auth/state";
import { Notice } from "./ui";

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function PayoutSetup({ started, enabled }: { started: boolean; enabled: boolean }) {
  const [state, action, pending] = useActionState(startPayoutSetupAction, AUTH_IDLE);

  if (enabled) {
    return (
      <Notice tone="brand" title="Your payouts are set up">
        Stripe has everything it needs, so buyers can pay for your listings by card and the money can settle to your connected account.
        <form action={action} className="mt-3">
          <input type="hidden" name="country" value="BG" />
          <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>
            {pending ? "Opening Stripe…" : "Open my Stripe settings"}
          </button>
        </form>
      </Notice>
    );
  }

  return (
    <div className="card p-6 lg:p-8">
      <h2 className="display text-xl">{started ? "Finish setting up payouts" : "Set up payouts"}</h2>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
        {started
          ? "Stripe still needs something from you before it can pay you. Continue to Stripe to finish verification and payout details."
          : "Choose the country where your Stripe-connected seller account is based. Stripe will collect your identity and bank details directly; Buildora does not see your bank details."}
      </p>

      {state.message && !state.ok ? (
        <p role="alert" className="mt-4 rounded-lg border border-[#f4c9c6] bg-[var(--color-danger-tint)] px-3 py-2.5 text-[0.8125rem] text-[var(--color-danger)]">
          {state.message}
        </p>
      ) : null}

      <form action={action} className="mt-5 space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Seller country</span>
          <select name="country" defaultValue="" required className="input w-full">
            <option value="" disabled>Select your country</option>
            {STRIPE_CONNECT_COUNTRIES.map((code) => (
              <option key={code} value={code}>{countryName(code)} ({code})</option>
            ))}
          </select>
        </label>

        <button type="submit" className="btn btn-brand btn-lg" disabled={pending}>
          {pending ? "Opening Stripe…" : started ? "Continue on Stripe" : "Set up payouts with Stripe"}
        </button>
      </form>

      <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        You will be taken to Stripe and returned here when you are done. Nothing is charged for payout setup.
      </p>
    </div>
  );
}
