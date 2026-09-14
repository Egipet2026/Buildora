import "server-only";

import type Stripe from "stripe";
import { paymentsEnabled, siteUrl, stripe } from "./stripe";
import { getServerSupabase } from "../supabase/server";
import { isDemoMode } from "../supabase/config";
import type { Listing, PaymentKind, Profile } from "../types";

/** ISO country codes where Stripe Express connected accounts are available. */
export const STRIPE_CONNECT_COUNTRIES = [
  "AE","AG","AL","AM","AR","AT","AU","BA","BE","BG","BH","BJ","BN","BO","BS","BW","CA","CH","CI","CL","CO","CR","CY","CZ","DE","DK","DO","EC","EE","EG","ES","ET","FI","FR","GB","GH","GM","GR","GT","GY","HK","HU","IE","IL","IS","IT","JM","JO","JP","KE","KH","KR","KW","LC","LK","LT","LU","LV","MA","MC","MD","MG","MK","MN","MO","MT","MU","MX","NA","NG","NL","NO","NZ","OM","PA","PE","PH","PK","PL","PT","PY","QA","RO","RS","RW","SA","SE","SG","SI","SK","SN","SV","TH","TN","TR","TT","TW","TZ","US","UY","UZ","VN","ZA",
] as const;

export type CheckoutRequest = {
  kind: PaymentKind;
  userId: string;
  label: string;
  description?: string;
  amountCents: number;
  currency: string;
  listingId?: string;
  days?: number;
  returnPath: string;
  transfer?: { destination: string; applicationFeeCents: number };
};

export type CheckoutResult =
  | { ok: true; url: string }
  | { ok: false; message: string };

export async function createCheckout(req: CheckoutRequest): Promise<CheckoutResult> {
  if (!paymentsEnabled()) return { ok: false, message: "Payments are not switched on for this site." };

  const base = siteUrl();
  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "payment",
    line_items: [{
      quantity: 1,
      price_data: {
        currency: req.currency.toLowerCase(),
        unit_amount: req.amountCents,
        product_data: {
          name: req.label,
          ...(req.description ? { description: req.description } : {}),
        },
      },
    }],
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
    params.payment_intent_data = {
      application_fee_amount: req.transfer.applicationFeeCents,
      transfer_data: { destination: req.transfer.destination },
    };
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create(params);
  } catch (error) {
    console.error("[stripe] could not create a checkout session:", error);
    return { ok: false, message: "The payment page could not be opened. Please try again shortly." };
  }

  if (!session.url) return { ok: false, message: "Stripe did not return a payment page." };

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

export async function ensureConnectedAccount(
  profile: Profile,
  email: string | null,
  country: string,
): Promise<string> {
  if (profile.stripe_account_id) return profile.stripe_account_id;

  const normalizedCountry = country.trim().toUpperCase();
  if (!STRIPE_CONNECT_COUNTRIES.includes(normalizedCountry as (typeof STRIPE_CONNECT_COUNTRIES)[number])) {
    throw new Error("Unsupported Stripe Connect country");
  }

  const account = await stripe().accounts.create({
    type: "express",
    country: normalizedCountry,
    ...(email ? { email } : {}),
    business_profile: { name: profile.full_name },
    capabilities: { transfers: { requested: true } },
    metadata: { profile_id: profile.id },
  });

  if (!isDemoMode) {
    const supabase = await getServerSupabase();
    await supabase?.from("profiles").update({ stripe_account_id: account.id }).eq("id", profile.id);
  }

  return account.id;
}

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

export async function refreshPayoutStatus(profile: Profile): Promise<boolean> {
  if (!profile.stripe_account_id || !paymentsEnabled()) return false;

  let enabled = false;
  try {
    const account = await stripe().accounts.retrieve(profile.stripe_account_id);
    enabled = Boolean(account.payouts_enabled && account.capabilities?.transfers === "active");
  } catch (error) {
    console.error("[stripe] could not read the connected account:", error);
    return profile.stripe_charges_enabled;
  }

  if (enabled !== profile.stripe_charges_enabled && !isDemoMode) {
    const supabase = await getServerSupabase();
    await supabase?.from("profiles").update({ stripe_charges_enabled: enabled }).eq("id", profile.id);
  }

  return enabled;
}

export function payoutBlocker(seller: Profile): string | null {
  if (!paymentsEnabled()) return "Card payments are not switched on for this site.";
  if (!seller.stripe_account_id || !seller.stripe_charges_enabled) {
    return "The seller has not finished setting up payouts, so this listing cannot be paid for by card yet.";
  }
  return null;
}

export type { Listing };
