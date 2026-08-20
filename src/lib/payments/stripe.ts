import "server-only";

import Stripe from "stripe";

/**
 * The Stripe client, and whether there is one at all.
 *
 * Payments are optional. With no key the site keeps working — a purchase
 * records the sale without moving money, exactly as it did before — so a fork
 * or a preview deployment is never broken by the absence of a Stripe account.
 * Every entry point checks `paymentsEnabled()` first and says plainly which
 * mode it is in rather than pretending a card was charged.
 */

const key = (process.env.STRIPE_SECRET_KEY ?? "").trim();

/** True when this deployment can take a card payment. */
export function paymentsEnabled(): boolean {
  return key.startsWith("sk_");
}

/** True when the key is Stripe's test key, which takes no real money. */
export function isTestMode(): boolean {
  return key.startsWith("sk_test_");
}

let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!paymentsEnabled())
    throw new Error("Stripe is not configured on this deployment.");
  // One client for the process: it holds a connection pool, and building a new
  // one per request throws that away.
  client ??= new Stripe(key);
  return client;
}

/**
 * Where Stripe sends the customer back to.
 *
 * Must be absolute, and must be this deployment — a relative path or a stale
 * localhost returns the buyer to nowhere after they have paid.
 */
export function siteUrl(): string {
  const explicit = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  if (explicit) return explicit.replace(/\/+$/, "");
  const vercel = (process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL ?? "").trim();
  if (vercel) return `https://${vercel.replace(/\/+$/, "")}`;
  return "http://localhost:3000";
}
