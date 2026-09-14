import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { paymentsEnabled, stripe } from "@/lib/payments/stripe";
import { getServiceSupabase } from "@/lib/supabase/service";
import { BUILDORA_COMMISSION_BPS, calculateFees } from "@/lib/money";
import { getListing, getSettings } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!paymentsEnabled()) return NextResponse.json({ error: "payments not configured" }, { status: 503 });

  const secret = (process.env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET is not set — refusing the webhook");
    return NextResponse.json({ error: "webhook not configured" }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "unsigned" }, { status: 400 });
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
        break;
    }
  } catch (error) {
    console.error(`[stripe] handling ${event.type} failed:`, error);
    return NextResponse.json({ error: "handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function settle(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return;

  const supabase = getServiceSupabase();
  if (!supabase) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set; cannot settle a payment");

  const { data: claimed } = await supabase
    .from("payments")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      stripe_payment_intent: String(session.payment_intent ?? "") || null,
    })
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
    const paidDays = Number(session.metadata?.days);
    const days = Number.isFinite(paidDays) && paidDays > 0 ? paidDays : settings.featured_days;
    const until = new Date(Date.now() + days * 86_400_000).toISOString();
    await supabase.from("listings").update(
      kind === "featured" ? { is_featured: true, featured_until: until } : { boosted_until: until },
    ).eq("id", listingId);
    return;
  }

  if (kind === "verification") {
    await supabase.from("profiles").update({ verification_status: "pending" }).eq("id", userId);
    return;
  }

  if (kind === "premium") {
    await supabase.from("profiles").update({ premium_tier: "premium" }).eq("id", userId);
    return;
  }

  if (kind === "listing_purchase" && listingId) {
    const listing = await getListing(listingId);
    if (!listing) return;

    // Keep the accounting record aligned with the same fixed 10% commission
    // used when the Checkout Session was created.
    const fees = calculateFees(Number(claimed.amount_cents), BUILDORA_COMMISSION_BPS);

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

/** For destination charges, sellers receive transfers rather than direct charges. */
async function syncAccount(account: Stripe.Account) {
  const supabase = getServiceSupabase();
  if (!supabase) return;

  const payoutReady = Boolean(account.payouts_enabled && account.capabilities?.transfers === "active");
  await supabase.from("profiles").update({ stripe_charges_enabled: payoutReady }).eq("stripe_account_id", account.id);
}
