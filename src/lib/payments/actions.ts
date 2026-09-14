"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser, getListing, getProfile, getSettings } from "../data";
import { BUILDORA_COMMISSION_BPS, calculateFees } from "../money";
import type { ActionState } from "../action-state";
import { createCheckout, ensureConnectedAccount, onboardingLink, payoutBlocker, STRIPE_CONNECT_COUNTRIES } from "./checkout";
import { paymentsEnabled } from "./stripe";

const fail = (message: string): ActionState => ({ ok: false, message });

export async function startPurchaseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) return fail("Sign in to buy this.");
  if (me.is_blocked) return fail("Your account is suspended.");

  const listing = await getListing(String(formData.get("listingId") ?? ""));
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id === me.id) return fail("You cannot buy your own listing.");
  if (listing.status !== "active") return fail("This listing is not available for purchase.");

  const seller = await getProfile(listing.owner_id);
  if (!seller) return fail("The seller's account is no longer available.");
  const blocked = payoutBlocker(seller);
  if (blocked) return fail(blocked);

  const settings = await getSettings();
  const fees = calculateFees(listing.price_cents, BUILDORA_COMMISSION_BPS);
  if (fees.amount_cents <= 0) return fail("This listing has no price set, so it cannot be paid for online.");

  const result = await createCheckout({
    kind: "listing_purchase",
    userId: me.id,
    label: listing.title,
    description: listing.summary?.slice(0, 200),
    amountCents: fees.amount_cents,
    currency: settings.currency,
    listingId: listing.id,
    returnPath: `/listing/${listing.id}`,
    transfer: { destination: seller.stripe_account_id!, applicationFeeCents: fees.fee_cents },
  });

  if (!result.ok) return fail(result.message);
  redirect(result.url);
}

export async function startPromotionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) return fail("Sign in first.");
  const [plan, chosenDays] = String(formData.get("choice") ?? "").split(":");
  if (plan !== "featured" && plan !== "boost") return fail("Unknown plan.");

  const listing = await getListing(String(formData.get("listingId") ?? ""));
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id !== me.id) return fail("You can only promote your own listings.");

  const settings = await getSettings();
  let days: number;
  let amount: number;
  if (plan === "featured") {
    days = settings.featured_days;
    amount = settings.featured_price_cents;
  } else {
    const wanted = Number(chosenDays);
    const tier = settings.boost_tiers.find((t) => t.days === wanted);
    if (!tier) return fail("Choose how long you want the boost to run.");
    days = tier.days;
    amount = tier.price_cents;
  }

  const result = await createCheckout({
    kind: plan,
    userId: me.id,
    label: plan === "featured" ? "Featured listing" : `Listing boost — ${days} days`,
    description: `${listing.title} — ${days} days`,
    amountCents: amount,
    currency: settings.currency,
    listingId: listing.id,
    days,
    returnPath: "/seller/promotions",
  });
  if (!result.ok) return fail(result.message);
  redirect(result.url);
}

export async function startVerificationPaymentAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) return fail("Sign in first.");
  if (me.verification_status === "verified") return fail("You are already verified.");
  const settings = await getSettings();
  const result = await createCheckout({
    kind: "verification",
    userId: me.id,
    label: "Verified Seller check",
    description: "Identity and company checks. Confirms who you are — never that a deal is a good one.",
    amountCents: settings.verification_fee_cents,
    currency: settings.currency,
    returnPath: "/seller/verification",
  });
  if (!result.ok) return fail(result.message);
  redirect(result.url);
}

export async function startPremiumAction(_prev: ActionState, _formData: FormData): Promise<ActionState> {
  const me = await getCurrentUser();
  if (!me) return fail("Sign in first.");
  const settings = await getSettings();
  const result = await createCheckout({
    kind: "premium",
    userId: me.id,
    label: "Premium Seller — one month",
    description: "Unlimited active listings, priority moderation and advanced analytics.",
    amountCents: settings.premium_monthly_cents,
    currency: settings.currency,
    returnPath: "/seller",
  });
  if (!result.ok) return fail(result.message);
  redirect(result.url);
}

export async function startPayoutSetupAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!paymentsEnabled()) return fail("Card payments are not switched on for this site.");
  const me = await getCurrentUser();
  if (!me) return fail("Sign in first.");
  if (me.is_blocked) return fail("Your account is suspended.");

  const country = String(formData.get("country") ?? "").trim().toUpperCase();
  if (!STRIPE_CONNECT_COUNTRIES.includes(country as (typeof STRIPE_CONNECT_COUNTRIES)[number])) {
    return fail("Choose a country supported for Stripe Connect payouts.");
  }

  try {
    const accountId = await ensureConnectedAccount(me, null, country);
    const url = await onboardingLink(accountId);
    revalidatePath("/seller/payouts");
    redirect(url);
  } catch (error) {
    console.error("[stripe] payout onboarding failed:", error);
    return fail("Stripe could not open the payout setup. Please try again shortly.");
  }
}
