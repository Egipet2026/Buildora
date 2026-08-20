import "server-only";

import type Stripe from "stripe";
import { paymentsEnabled, siteUrl, stripe } from "./stripe";
import { getServerSupabase } from "../supabase/server";
import { isDemoMode } from "../supabase/config";
import type { Listing, PaymentKind, Profile } from "../types";

/**
 * Building a Stripe Checkout session, and recording that we did.
 *
 * Two shapes of payment exist here and they are not the same transaction:
 *
 *   Platform revenue — Featured, Boost, verification, Premium. The money is
 *   the platform's. An ordinary charge.
 *
 *   A sale between members — the buyer pays, the seller is paid directly by
 *   Stripe, and the platform keeps its commission as an application fee. This
 *   needs the seller to have completed Stripe onboarding, because the money
 *   never belongs to the platform on the way past.
 *
 * The amount is always computed here from the listing and the platform
 * settings. Nothing that arrives in a form decides what anybody is charged.
 */

export type CheckoutRequest = {
  kind: PaymentKind;
  userId: string;
  /** Shown on the Stripe page. The buyer must recognise what they are paying for. */
  label: string;
  description?: string;
  amountCents: number;
  currency: string;
  listingId?: string;
  /**
   * How many days the purchase buys, for placements. Carried on the Stripe
   * session so the webhook grants the length that was actually paid for,
   * rather than re-reading a setting that may have changed since.
   */
  days?: number;
  /** Where to send the customer once Stripe is done with them. */
  returnPath: string;
  /**
   * Set only for a sale between members: the seller's connected account and
   * the platform's cut of the payment.
   */
  transfer?: { destination: string; applicationFeeCents: number };
};

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function createCheckout(
  req: CheckoutRequest,
): Promise<CheckoutResult> {
  if (!paymentsEnabled())
    return { ok: false, message: "Payments are not switched on for this site." };

  const base = siteUrl();
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: req.currency.toLowerCase(),
          unit_amount: req.amountCents,
          product_data: {
            name: req.label,
            ...(req.description ? { description: req.description } : {}),
          },
        },
      },
    ],
    // Read back by the webhook, which is the only thing that grants anything.
    metadata: {
      kind: req.kind,
      user_id: req.userId,
      ...(req.listingId ? { listing_id: req.listingId } : {}),
      ...(req.days ? { days: String(req.days) } : {}),
    },
    success_url: `${base}${req.returnPath}${req.returnPath.includes("?") ? "&" : "?"}paid=1`,
    cancel_url: `${base}${req.returnPath}?cancelled=1`,
  };

  if (req.transfer) {
    // A destination charge: Stripe settles to the seller and takes the
    // platform's commission out on the way, so the platform never holds
    // money that is not its own.
    params.payment_intent_data = {
      application_fee_amount: req.transfer.applicationFeeCents,
      transfer_data: { destination: req.transfer.destination },
    };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(params);
  } catch (error) {
    // Stripe's message can name the account, so it goes to the log, not the page.
    console.error("[stripe] could not create a checkout session:", error);
    return {
      ok: false,
      message: "The payment page could not be opened. Please try again shortly.",
    };
  }

  if (!session.url)
    return { ok: false, message: "Stripe did not return a payment page." };

  // Recorded before the customer leaves, so an abandoned checkout is visible
  // as a pending row rather than as nothing at all.
  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    await supabase?.from("payments").insert({
      user_id: req.userId,
      kind: req.kind,
      listing_id: req.listingId ?? null,
      amount_cents: req.amountCents,
      fee_cents: req.transfer?.applicationFeeCents ?? req.amountCents,
      currency: req.currency,
      status: "pending",
      stripe_session_id: session.id,
    });
  }

  return { ok: true, url: session.url };
}

/* ------------------------------------------------------------- payouts */

/**
 * The seller's Stripe account, created on first use.
 *
 * Express accounts are used deliberately: Stripe collects the identity and
 * bank details and carries the compliance obligations that come with them,
 * which is not something this platform should be holding.
 */
export async function ensureConnectedAccount(
  profile: Profile,
  email: string | null,
): Promise<string> {
  if (profile.stripe_account_id) return profile.stripe_account_id;

  const account = await stripe().accounts.create({
    type: "express",
    ...(email ? { email } : {}),
    business_profile: { name: profile.full_name },
    capabilities: { transfers: { requested: true } },
    metadata: { profile_id: profile.id },
  });

  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    await supabase
      ?.from("profiles")
      .update({ stripe_account_id: account.id })
      .eq("id", profile.id);
  }

  return account.id;
}

/** A one-time link into Stripe's onboarding, or back into it if it stalled. */
export async function onboardingLink(accountId: string): Promise<string> {
  const base = siteUrl();
  const link = await stripe().accountLinks.create({
    account: accountId,
    type: "account_onboarding",
    refresh_url: `${base}/seller/payouts?refresh=1`,
    return_url: `${base}/seller/payouts?done=1`,
  });
  return link.url;
}

/** Stripe's own answer to "may this account be paid?", refreshed on demand. */
export async function refreshPayoutStatus(profile: Profile): Promise<boolean> {
  if (!profile.stripe_account_id || !paymentsEnabled()) return false;

  let enabled = false;
  try {
    const account = await stripe().accounts.retrieve(profile.stripe_account_id);
    enabled = Boolean(account.charges_enabled);
  } catch (error) {
    console.error("[stripe] could not read the connected account:", error);
    return profile.stripe_charges_enabled;
  }

  if (enabled !== profile.stripe_charges_enabled && !isDemoMode) {
    const supabase = await getServerSupabase();
    await supabase
      ?.from("profiles")
      .update({ stripe_charges_enabled: enabled })
      .eq("id", profile.id);
  }

  return enabled;
}

/** Why a listing cannot be bought with a card yet, or null when it can. */
export function payoutBlocker(seller: Profile): string | null {
  if (!paymentsEnabled()) return "Card payments are not switched on for this site.";
  if (!seller.stripe_account_id || !seller.stripe_charges_enabled)
    return "The seller has not finished setting up payouts, so this listing cannot be paid for by card yet. Message them to agree how to complete the sale.";
  return null;
}

export type { Listing };
