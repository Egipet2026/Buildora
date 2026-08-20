import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { paymentsEnabled, stripe } from "@/lib/payments/stripe";
import { getServiceSupabase } from "@/lib/supabase/service";
import { calculateFees } from "@/lib/money";
import { getListing, getSettings } from "@/lib/data";

/**
 * Stripe's webhook: the only thing on this site that grants anything paid for.
 *
 * The browser is never believed about a payment. A buyer returning to the
 * success page proves only that their browser followed a redirect — they may
 * have edited the URL, the card may still be processing, or they may have
 * closed the tab before it loaded. Stripe telling the server, signed, is what
 * counts, and it is what this route waits for.
 *
 * Three properties this has to hold:
 *
 *   Signed — an unsigned request is refused. Without that, anyone who knows
 *   the URL could grant themselves a Featured slot by posting JSON to it.
 *
 *   Idempotent — Stripe delivers at least once and retries on any non-2xx,
 *   so the same session will arrive again. Every grant below is guarded on
 *   the payment row still being `pending`, and the session id is unique in
 *   the database, so a redelivery changes nothing.
 *
 *   Quiet on failure — a 500 tells Stripe to retry, which is right for a
 *   transient fault and wrong for a message this server will never
 *   understand. Unknown event types are acknowledged, not retried forever.
 */

export const runtime = "nodejs";
// The signature is computed over the exact bytes Stripe sent, so this route
// must never be cached or pre-rendered.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!paymentsEnabled())
    return NextResponse.json({ error: "payments not configured" }, { status: 503 });

  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set — refusing the webhook");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature)
    return NextResponse.json({ error: "unsigned" }, { status: 400 });

  // Raw body: parsing it first would change the bytes the signature covers.
  const body = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(body, signature, secret);
  } catch (error) {
    console.error("[stripe] signature check failed:", error);
    return NextResponse.json({ error: "bad signature" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await settle(event.data.object);
        break;
      case "account.updated":
        await syncAccount(event.data.object);
        break;
      default:
        // Acknowledged rather than retried: this server will never understand
        // it, and a 500 would have Stripe redelivering it for days.
        break;
    }
  } catch (error) {
    // A genuine fault. 500 asks Stripe to try again, which is what we want.
    console.error(`[stripe] handling ${event.type} failed:`, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

/* ------------------------------------------------------------- handlers */

async function settle(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const supabase = getServiceSupabase();
  if (!supabase) {
    // Without the service role this cannot write past row-level security.
    // Throwing asks Stripe to retry, which is right: the payment is real and
    // must not be silently dropped.
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; cannot settle a payment");
  }

  // Claim the row. `.eq("status", "pending")` is the whole idempotency
  // mechanism: the second delivery of the same session updates no rows and
  // returns here before anything is granted.
  const { data: claimed } = await supabase
    .from("payments")
    .update({ status: "paid", paid_at: new Date().toISOString(),
              stripe_payment_intent: String(session.payment_intent ?? "") || null })
    .eq("stripe_session_id", session.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (!claimed) return;

  const kind = String(claimed.kind);
  const userId = String(claimed.user_id);
  const listingId = claimed.listing_id ? String(claimed.listing_id) : null;

  if (kind === "featured" || kind === "boost") {
    if (!listingId) return;
    const settings = await getSettings();
    const days = kind === "featured" ? settings.featured_days : settings.boost_days;
    const until = new Date(Date.now() + days * 86_400_000).toISOString();
    await supabase
      .from("listings")
      .update(
        kind === "featured"
          ? { is_featured: true, featured_until: until }
          : { boosted_until: until },
      )
      .eq("id", listingId);
    return;
  }

  if (kind === "verification") {
    await supabase
      .from("profiles")
      .update({ verification_status: "pending" })
      .eq("id", userId);
    return;
  }

  if (kind === "premium") {
    await supabase.from("profiles").update({ premium_tier: "premium" }).eq("id", userId);
    return;
  }

  if (kind === "listing_purchase" && listingId) {
    const listing = await getListing(listingId);
    if (!listing) return;

    const settings = await getSettings();
    const fees = calculateFees(Number(claimed.amount_cents), settings.commission_bps);

    // Unique on stripe_session_id, so a redelivery that got past the claim
    // above still cannot record the sale twice.
    await supabase.from("transactions").insert({
      listing_id: listing.id,
      buyer_id: userId,
      seller_id: listing.owner_id,
      amount_cents: fees.amount_cents,
      fee_bps: fees.fee_bps,
      fee_cents: fees.fee_cents,
      net_cents: fees.net_cents,
      status: "paid",
      provider: "stripe",
      stripe_session_id: session.id,
      stripe_payment_intent: String(session.payment_intent ?? "") || null,
    });

    await supabase.from("listings").update({ status: "sold" }).eq("id", listing.id);

    await supabase.from("notifications").insert({
      user_id: listing.owner_id,
      type: "offer_accepted",
      title: `${listing.title} has been paid for`,
      body: "Stripe is settling the money to your connected account. The listing is now marked sold.",
      link: "/seller/listings",
      is_read: false,
    });
  }
}

/** Mirrors Stripe's verdict on whether a seller may be paid. */
async function syncAccount(account: Stripe.Account) {
  const supabase = getServiceSupabase();
  if (!supabase) return;

  await supabase
    .from("profiles")
    .update({ stripe_charges_enabled: Boolean(account.charges_enabled) })
    .eq("stripe_account_id", account.id);
}
