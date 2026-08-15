"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { isDemoMode } from "./supabase/config";
import { getServerSupabase } from "./supabase/server";
import { demoId, demoStore } from "./demo/store";
import {
  getCurrentUser,
  getListing,
  getOffers,
  getSettings,
  requireAdmin,
} from "./data";
import { calculateFees } from "./money";
import type { ActionState, PlanState } from "./action-state";
import { MARKETPLACE_BY_KIND } from "./taxonomy";
import {
  businessPlanSchema,
  businessProfileSchema,
  fieldErrors,
  listingSchema,
  messageSchema,
  offerSchema,
  reportSchema,
  startConversationSchema,
  verificationSchema,
} from "./validation";
import type {
  BusinessProfile,
  Conversation,
  DealType,
  Listing,
  ListingKind,
  Message,
  Notification,
  NotificationType,
  Offer,
  Report,
  Transaction,
  VerificationRequest,
} from "./types";

function fail(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors };
}

/** Every mutation funnels through here so auth is never accidentally skipped. */
async function currentUserOrFail() {
  const me = await getCurrentUser();
  if (!me) return { me: null, error: fail("You need to sign in to do that.") };
  if (me.is_blocked)
    return {
      me: null,
      error: fail("Your account is suspended and cannot perform this action."),
    };
  return { me, error: null };
}

async function insertNotification(n: {
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
}) {
  const row: Notification = {
    id: demoId("n"),
    is_read: false,
    created_at: new Date().toISOString(),
    ...n,
  };
  if (isDemoMode) {
    demoStore().notifications.unshift(row);
    return;
  }
  const supabase = await getServerSupabase();
  const { id: _id, ...insert } = row;
  await supabase?.from("notifications").insert(insert);
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);

// --------------------------------------------------------------- listings

export async function createListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = listingSchema.safeParse({
    ...Object.fromEntries(formData),
    dealTypes: formData.getAll("dealTypes"),
  });
  if (!parsed.success) {
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  }
  const v = parsed.data;

  const kind = v.kind as ListingKind;
  const marketplace = MARKETPLACE_BY_KIND[kind];
  if (!marketplace?.categories.some((c) => c.slug === v.category)) {
    return fail("That category does not belong to the selected marketplace.", {
      category: "Choose a category from the list",
    });
  }

  const now = new Date().toISOString();
  const listing: Listing = {
    id: demoId("l"),
    owner_id: me!.id,
    kind,
    category_slug: v.category,
    title: v.title,
    slug: `${slugify(v.title)}-${Math.random().toString(36).slice(2, 7)}`,
    summary: v.summary,
    description: v.description,
    country: v.country,
    currency: "EUR",
    price_cents: v.price,
    deal_types: v.dealTypes as DealType[],
    // Everything lands in moderation. Nothing goes live unreviewed.
    status: "pending",
    is_verified: false,
    is_featured: false,
    featured_until: null,
    boosted_until: null,
    views_count: 0,
    saves_count: 0,
    cover_url: null,
    gallery: [],
    metrics: {
      annual_revenue_cents: v.annualRevenue || undefined,
      monthly_revenue_cents: v.monthlyRevenue || undefined,
      annual_expenses_cents: v.annualExpenses || undefined,
      annual_profit_cents: v.annualProfit || undefined,
      monthly_profit_cents: v.annualProfit
        ? Math.round(v.annualProfit / 12)
        : undefined,
    },
    attributes: {
      business_model: v.businessModel || undefined,
      year_founded: v.yearFounded ? Number(v.yearFounded) : undefined,
      website: v.website ?? undefined,
      socials: v.socials
        ? v.socials
            .split(/[\n,]/)
            .map((s) => s.trim())
            .filter(Boolean)
            .map((url) => ({ label: labelForUrl(url), url }))
        : undefined,
      reason_for_selling: v.reasonForSelling || undefined,
      assets_included: v.assetsIncluded.length ? v.assetsIncluded : undefined,
      is_online:
        v.isOnline === "online" ? true : v.isOnline === "offline" ? false : undefined,
      patent_number: v.patentNumber || undefined,
      jurisdiction: v.jurisdiction || undefined,
      patent_status: v.patentStatus || undefined,
      rights_holder: v.rightsHolder || undefined,
      filing_date: v.filingDate || undefined,
      technology_field: v.technologyField || undefined,
      license_price_cents: v.licensePrice || undefined,
      license_period: v.licensePeriod || undefined,
      skills: v.skills.length ? v.skills : undefined,
      experience_years: v.experienceYears ? Number(v.experienceYears) : undefined,
      rate_unit: v.rateUnit || undefined,
      investment_required_cents: v.investmentRequired || undefined,
      remote: v.remote === "remote" ? true : v.remote === "onsite" ? false : undefined,
      deal_types: v.dealTypes as DealType[],
    },
    documents: [],
    rejection_reason: null,
    created_at: now,
    published_at: null,
  };

  if (isDemoMode) {
    demoStore().listings.unshift(listing);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = listing;
    const { data, error: dbError } = await supabase!
      .from("listings")
      .insert(insert)
      .select("id")
      .single();
    if (dbError) return fail(dbError.message);
    listing.id = (data as { id: string }).id;
  }

  revalidatePath("/seller/listings");
  revalidatePath("/admin/listings");
  return {
    ok: true,
    message: "Listing submitted. It will appear once a moderator approves it.",
    redirectTo: `/seller/listings?submitted=${listing.id}`,
  };
}

function labelForUrl(url: string): string {
  const host = url.replace(/^https?:\/\//, "").split("/")[0];
  const name = host.replace(/^www\./, "").split(".")[0];
  return name.charAt(0).toUpperCase() + name.slice(1);
}

// -------------------------------------------------------------- favorites

export async function toggleFavoriteAction(formData: FormData) {
  const me = await getCurrentUser();
  const listingId = String(formData.get("listingId") ?? "");
  const back = String(formData.get("redirectTo") ?? "/");
  if (!me || !listingId) redirect("/login");

  const store = demoStore();
  if (isDemoMode) {
    const idx = store.favorites.findIndex(
      (f) => f.user_id === me.id && f.listing_id === listingId,
    );
    const listing = store.listings.find((l) => l.id === listingId);
    if (idx >= 0) {
      store.favorites.splice(idx, 1);
      if (listing) listing.saves_count = Math.max(0, listing.saves_count - 1);
    } else {
      store.favorites.push({
        user_id: me.id,
        listing_id: listingId,
        created_at: new Date().toISOString(),
      });
      if (listing) listing.saves_count += 1;
    }
  } else {
    const supabase = await getServerSupabase();
    const { data } = await supabase!
      .from("favorites")
      .select("listing_id")
      .eq("user_id", me.id)
      .eq("listing_id", listingId)
      .maybeSingle();
    if (data) {
      await supabase!
        .from("favorites")
        .delete()
        .eq("user_id", me.id)
        .eq("listing_id", listingId);
    } else {
      await supabase!
        .from("favorites")
        .insert({ user_id: me.id, listing_id: listingId });
    }
  }

  revalidatePath(back);
  revalidatePath("/dashboard/saved");
}

// ----------------------------------------------------------------- offers

export async function createOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = offerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const listing = await getListing(v.listingId);
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id === me!.id)
    return fail("You cannot make an offer on your own listing.");
  if (listing.status !== "active")
    return fail("This listing is not currently accepting offers.");
  if (!listing.deal_types.includes(v.dealType))
    return fail("That deal type is not offered on this listing.");

  const offer: Offer = {
    id: demoId("o"),
    listing_id: listing.id,
    buyer_id: me!.id,
    seller_id: listing.owner_id,
    amount_cents: v.amount,
    deal_type: v.dealType,
    message: v.message,
    status: "pending",
    parent_offer_id: null,
    created_at: new Date().toISOString(),
  };

  await persistOffer(offer);
  await insertNotification({
    user_id: listing.owner_id,
    type: "offer_received",
    title: `New offer on ${listing.title}`,
    body: `${me!.full_name} offered ${(v.amount / 100).toLocaleString("en-IE", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    })}.`,
    link: "/seller/offers",
  });

  revalidatePath(`/listing/${listing.id}`);
  revalidatePath("/dashboard/offers");
  return {
    ok: true,
    message: "Offer sent. You will be notified when the seller responds.",
    redirectTo: "/dashboard/offers",
  };
}

async function persistOffer(offer: Offer) {
  if (isDemoMode) {
    demoStore().offers.unshift(offer);
    return;
  }
  const supabase = await getServerSupabase();
  const { id: _id, ...insert } = offer;
  await supabase?.from("offers").insert(insert);
}

/** Accept, reject or counter — the three moves in a negotiation. */
export async function respondToOfferAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const offerId = String(formData.get("offerId") ?? "");
  const action = String(formData.get("action") ?? "");
  const offers = await getOffers();
  const offer = offers.find((o) => o.id === offerId);
  if (!offer) return fail("That offer no longer exists.");

  // Either party may act, but only on an offer that is waiting on them.
  const isSeller = offer.seller_id === me!.id;
  const isBuyer = offer.buyer_id === me!.id;
  if (!isSeller && !isBuyer) return fail("You are not part of this negotiation.");
  if (offer.status !== "pending")
    return fail("This offer has already been answered.");

  const listing = await getListing(offer.listing_id);

  if (action === "counter") {
    const parsed = z
      .object({
        amount: z
          .string()
          .transform((s) => Math.round(parseFloat(s.replace(/[^0-9.]/g, "")) * 100))
          .refine((n) => Number.isFinite(n) && n > 0, "Enter a counter amount"),
        message: z.string().trim().min(5, "Add a short message").max(4000),
      })
      .safeParse(Object.fromEntries(formData));
    if (!parsed.success)
      return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

    await updateOfferStatus(offer.id, "countered");
    const counter: Offer = {
      id: demoId("o"),
      listing_id: offer.listing_id,
      buyer_id: offer.buyer_id,
      seller_id: offer.seller_id,
      amount_cents: parsed.data.amount,
      deal_type: offer.deal_type,
      message: parsed.data.message,
      status: "pending",
      parent_offer_id: offer.id,
      created_at: new Date().toISOString(),
    };
    await persistOffer(counter);
    await insertNotification({
      user_id: isSeller ? offer.buyer_id : offer.seller_id,
      type: "offer_countered",
      title: `Counter-offer on ${listing?.title ?? "a listing"}`,
      body: `${me!.full_name} countered with €${(parsed.data.amount / 100).toLocaleString("en-IE")}.`,
      link: isSeller ? "/dashboard/offers" : "/seller/offers",
    });
    revalidatePath("/dashboard/offers");
    revalidatePath("/seller/offers");
    return { ok: true, message: "Counter-offer sent." };
  }

  if (action === "accept" || action === "reject") {
    // Only the party who *received* the offer can accept or reject it.
    const lastMoveWasSeller = !!offer.parent_offer_id && isSeller;
    if (lastMoveWasSeller)
      return fail("You made this offer — wait for the other side to respond.");

    await updateOfferStatus(offer.id, action === "accept" ? "accepted" : "rejected");
    await insertNotification({
      user_id: isSeller ? offer.buyer_id : offer.seller_id,
      type: action === "accept" ? "offer_accepted" : "offer_rejected",
      title:
        action === "accept"
          ? `Offer accepted on ${listing?.title ?? "a listing"}`
          : `Offer declined on ${listing?.title ?? "a listing"}`,
      body:
        action === "accept"
          ? "Continue in messages to agree terms and complete the transaction."
          : "The other party declined this offer.",
      link: isSeller ? "/dashboard/offers" : "/seller/offers",
    });

    revalidatePath("/dashboard/offers");
    revalidatePath("/seller/offers");
    return {
      ok: true,
      message:
        action === "accept"
          ? "Offer accepted. Agree the remaining terms in messages."
          : "Offer declined.",
    };
  }

  return fail("Unknown action.");
}

async function updateOfferStatus(id: string, status: Offer["status"]) {
  if (isDemoMode) {
    const o = demoStore().offers.find((x) => x.id === id);
    if (o) o.status = status;
    return;
  }
  const supabase = await getServerSupabase();
  await supabase?.from("offers").update({ status }).eq("id", id);
}

// -------------------------------------------------------------- messaging

export async function startConversationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = startConversationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const listing = await getListing(parsed.data.listingId);
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id === me!.id)
    return fail("This is your own listing.");

  const now = new Date().toISOString();
  let conversationId: string;

  if (isDemoMode) {
    const store = demoStore();
    let convo = store.conversations.find(
      (c) =>
        c.listing_id === listing.id &&
        c.buyer_id === me!.id &&
        c.seller_id === listing.owner_id,
    );
    if (!convo) {
      convo = {
        id: demoId("c"),
        listing_id: listing.id,
        buyer_id: me!.id,
        seller_id: listing.owner_id,
        last_message_at: now,
      };
      store.conversations.unshift(convo);
    }
    conversationId = convo.id;
    store.messages.push({
      id: demoId("m"),
      conversation_id: convo.id,
      sender_id: me!.id,
      body: parsed.data.body,
      attachments: [],
      read_at: null,
      created_at: now,
    });
    convo.last_message_at = now;
  } else {
    const supabase = await getServerSupabase();
    const { data: existing } = await supabase!
      .from("conversations")
      .select("id")
      .eq("listing_id", listing.id)
      .eq("buyer_id", me!.id)
      .eq("seller_id", listing.owner_id)
      .maybeSingle();

    if (existing) {
      conversationId = (existing as { id: string }).id;
    } else {
      const { data, error: dbError } = await supabase!
        .from("conversations")
        .insert({
          listing_id: listing.id,
          buyer_id: me!.id,
          seller_id: listing.owner_id,
          last_message_at: now,
        })
        .select("id")
        .single();
      if (dbError) return fail(dbError.message);
      conversationId = (data as { id: string }).id;
    }

    await supabase!.from("messages").insert({
      conversation_id: conversationId,
      sender_id: me!.id,
      body: parsed.data.body,
      attachments: [],
    });
    await supabase!
      .from("conversations")
      .update({ last_message_at: now })
      .eq("id", conversationId);
  }

  await insertNotification({
    user_id: listing.owner_id,
    type: "message_received",
    title: `New message from ${me!.full_name}`,
    body: parsed.data.body.slice(0, 140),
    link: `/messages/${conversationId}`,
  });

  revalidatePath("/messages");
  return {
    ok: true,
    message: "Message sent.",
    redirectTo: `/messages/${conversationId}`,
  };
}

export async function sendMessageAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const now = new Date().toISOString();
  const message: Message = {
    id: demoId("m"),
    conversation_id: parsed.data.conversationId,
    sender_id: me!.id,
    body: parsed.data.body,
    attachments: [],
    read_at: null,
    created_at: now,
  };

  if (isDemoMode) {
    const store = demoStore();
    const convo = store.conversations.find(
      (c) => c.id === parsed.data.conversationId,
    );
    if (!convo) return fail("Conversation not found.");
    if (convo.buyer_id !== me!.id && convo.seller_id !== me!.id)
      return fail("You are not part of this conversation.");
    store.messages.push(message);
    convo.last_message_at = now;
    // Reading the thread implies the other side's messages are now seen.
    for (const m of store.messages) {
      if (m.conversation_id === convo.id && m.sender_id !== me!.id && !m.read_at)
        m.read_at = now;
    }
    await insertNotification({
      user_id: convo.buyer_id === me!.id ? convo.seller_id : convo.buyer_id,
      type: "message_received",
      title: `New message from ${me!.full_name}`,
      body: parsed.data.body.slice(0, 140),
      link: `/messages/${convo.id}`,
    });
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = message;
    // RLS restricts inserts to conversation participants, so a non-member
    // simply gets an error here rather than a silent write.
    const { error: dbError } = await supabase!.from("messages").insert(insert);
    if (dbError) return fail(dbError.message);
    await supabase!
      .from("conversations")
      .update({ last_message_at: now })
      .eq("id", parsed.data.conversationId);
  }

  revalidatePath(`/messages/${parsed.data.conversationId}`);
  revalidatePath("/messages");
  return { ok: true };
}

export async function markMessagesReadAction(conversationId: string) {
  const me = await getCurrentUser();
  if (!me) return;
  const now = new Date().toISOString();

  if (isDemoMode) {
    for (const m of demoStore().messages) {
      if (m.conversation_id === conversationId && m.sender_id !== me.id && !m.read_at)
        m.read_at = now;
    }
    return;
  }
  const supabase = await getServerSupabase();
  await supabase
    ?.from("messages")
    .update({ read_at: now })
    .eq("conversation_id", conversationId)
    .neq("sender_id", me.id)
    .is("read_at", null);
}

// ---------------------------------------------------------- notifications

export async function markAllNotificationsReadAction() {
  const me = await getCurrentUser();
  if (!me) return;
  if (isDemoMode) {
    for (const n of demoStore().notifications) {
      if (n.user_id === me.id) n.is_read = true;
    }
  } else {
    const supabase = await getServerSupabase();
    await supabase
      ?.from("notifications")
      .update({ is_read: true })
      .eq("user_id", me.id)
      .eq("is_read", false);
  }
  revalidatePath("/dashboard/notifications");
}

// ------------------------------------------------------------- moderation

export async function reportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const report: Report = {
    id: demoId("r"),
    reporter_id: me!.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason,
    details: parsed.data.details,
    status: "open",
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().reports.unshift(report);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = report;
    await supabase?.from("reports").insert(insert);
  }

  revalidatePath("/admin/reports");
  return { ok: true, message: "Report submitted. Our team will review it." };
}

export async function requestVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = verificationSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const request: VerificationRequest = {
    id: demoId("v"),
    user_id: me!.id,
    listing_id: parsed.data.listingId || null,
    kind: parsed.data.kind,
    evidence: [{ label: "Submitted evidence", value: parsed.data.evidence }],
    status: "pending",
    notes: null,
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().verifications.unshift(request);
    const profile = demoStore().profiles.find((p) => p.id === me!.id);
    if (profile && parsed.data.kind === "seller")
      profile.verification_status = "pending";
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = request;
    await supabase?.from("verification_requests").insert(insert);
  }

  revalidatePath("/seller/verification");
  revalidatePath("/admin/verification");
  return {
    ok: true,
    message:
      "Verification request submitted. We will confirm the details you provided — verification never certifies that a deal is a good one.",
  };
}

// ------------------------------------------------------- mock transactions

/**
 * Simulated checkout.
 *
 * Records the transaction and the 10% commission split, but moves no money:
 * there is no PSP, no escrow and no payout. Real funds flow only once a
 * marketplace payment provider is integrated and the required legal and
 * compliance requirements are met.
 */
export async function mockCheckoutAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await getListing(listingId);
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id === me!.id)
    return fail("You cannot buy your own listing.");
  if (listing.status !== "active")
    return fail("This listing is not available for purchase.");

  const settings = await getSettings();
  const amount = Number(formData.get("amount")) || listing.price_cents;
  const fees = calculateFees(amount, settings.commission_bps);

  const transaction: Transaction = {
    id: demoId("t"),
    listing_id: listing.id,
    buyer_id: me!.id,
    seller_id: listing.owner_id,
    amount_cents: fees.amount_cents,
    fee_bps: fees.fee_bps,
    fee_cents: fees.fee_cents,
    net_cents: fees.net_cents,
    status: "pending",
    provider: "mock",
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().transactions.unshift(transaction);
    const l = demoStore().listings.find((x) => x.id === listing.id);
    if (l) l.status = "sold";
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = transaction;
    const { error: dbError } = await supabase!.from("transactions").insert(insert);
    if (dbError) return fail(dbError.message);
    await supabase!.from("listings").update({ status: "sold" }).eq("id", listing.id);
  }

  await insertNotification({
    user_id: listing.owner_id,
    type: "offer_accepted",
    title: `${listing.title} marked as sold`,
    body: "A test transaction was recorded. No funds were moved in this MVP.",
    link: "/seller/listings",
  });

  revalidatePath(`/listing/${listing.id}`);
  revalidatePath("/dashboard/purchases");
  return {
    ok: true,
    message: "Test transaction recorded. No real payment was taken.",
    redirectTo: "/dashboard/purchases",
  };
}

/** Buys a Featured slot or a Boost for one of the seller's own listings. */
export async function promoteListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const listingId = String(formData.get("listingId") ?? "");
  const plan = String(formData.get("plan") ?? "");
  const listing = await getListing(listingId);
  if (!listing) return fail("That listing no longer exists.");
  if (listing.owner_id !== me!.id)
    return fail("You can only promote your own listings.");

  const settings = await getSettings();
  const days = plan === "featured" ? settings.featured_days : settings.boost_days;
  if (plan !== "featured" && plan !== "boost") return fail("Unknown plan.");

  const until = new Date(Date.now() + days * 86_400_000).toISOString();
  const patch =
    plan === "featured"
      ? { is_featured: true, featured_until: until }
      : { boosted_until: until };

  if (isDemoMode) {
    const l = demoStore().listings.find((x) => x.id === listingId);
    if (l) Object.assign(l, patch);
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("listings").update(patch).eq("id", listingId);
  }

  revalidatePath("/seller/listings");
  revalidatePath("/seller/promotions");
  return {
    ok: true,
    message: `${plan === "featured" ? "Featured" : "Boost"} activated for ${days} days (test billing — no payment taken).`,
  };
}

// ----------------------------------------------------------------- admin

export async function adminModerateListingAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Administrator access required.");

  const listingId = String(formData.get("listingId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const reason = String(formData.get("reason") ?? "").trim();

  const listing = await getListing(listingId);
  if (!listing) return fail("That listing no longer exists.");

  if (decision === "reject" && reason.length < 5)
    return fail("Give the seller a reason for the rejection.", {
      reason: "A short explanation is required",
    });

  const patch: Partial<Listing> =
    decision === "approve"
      ? {
          status: "active",
          published_at: new Date().toISOString(),
          rejection_reason: null,
        }
      : decision === "reject"
        ? { status: "rejected", rejection_reason: reason }
        : decision === "verify"
          ? { is_verified: true }
          : decision === "unverify"
            ? { is_verified: false }
            : decision === "archive"
              ? { status: "archived" }
              : decision === "feature"
                ? {
                    is_featured: true,
                    featured_until: new Date(Date.now() + 7 * 86_400_000).toISOString(),
                  }
                : decision === "unfeature"
                  ? { is_featured: false, featured_until: null }
                  : {};

  if (!Object.keys(patch).length) return fail("Unknown decision.");

  if (isDemoMode) {
    const l = demoStore().listings.find((x) => x.id === listingId);
    if (l) Object.assign(l, patch);
  } else {
    const supabase = await getServerSupabase();
    const { error: dbError } = await supabase!
      .from("listings")
      .update(patch)
      .eq("id", listingId);
    if (dbError) return fail(dbError.message);
  }

  if (decision === "approve" || decision === "reject") {
    await insertNotification({
      user_id: listing.owner_id,
      type: decision === "approve" ? "listing_approved" : "listing_rejected",
      title:
        decision === "approve"
          ? `${listing.title} is live`
          : `${listing.title} was not approved`,
      body:
        decision === "approve"
          ? "Your listing has been approved and is now visible on the marketplace."
          : reason,
      link: decision === "approve" ? `/listing/${listing.id}` : "/seller/listings",
    });
  }

  revalidatePath("/admin/listings");
  revalidatePath(`/listing/${listingId}`);
  return { ok: true, message: "Listing updated." };
}

export async function adminUserAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Administrator access required.");

  const userId = String(formData.get("userId") ?? "");
  const action = String(formData.get("action") ?? "");
  if (userId === admin.id) return fail("You cannot moderate your own account.");

  const patch =
    action === "block"
      ? { is_blocked: true }
      : action === "unblock"
        ? { is_blocked: false }
        : action === "verify"
          ? { is_verified: true, verification_status: "verified" as const }
          : action === "unverify"
            ? { is_verified: false, verification_status: "none" as const }
            : null;
  if (!patch) return fail("Unknown action.");

  if (isDemoMode) {
    const p = demoStore().profiles.find((x) => x.id === userId);
    if (p) Object.assign(p, patch);
  } else {
    const supabase = await getServerSupabase();
    const { error: dbError } = await supabase!
      .from("profiles")
      .update(patch)
      .eq("id", userId);
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/admin/users");
  return { ok: true, message: "Member updated." };
}

export async function adminReportAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Administrator access required.");

  const reportId = String(formData.get("reportId") ?? "");
  const status = String(formData.get("status") ?? "") as Report["status"];
  if (!["open", "reviewing", "resolved", "dismissed"].includes(status))
    return fail("Unknown status.");

  if (isDemoMode) {
    const r = demoStore().reports.find((x) => x.id === reportId);
    if (r) r.status = status;
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("reports").update({ status }).eq("id", reportId);
  }

  revalidatePath("/admin/reports");
  return { ok: true, message: "Report updated." };
}

export async function adminVerificationAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Administrator access required.");

  const id = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();
  if (decision !== "verified" && decision !== "rejected")
    return fail("Unknown decision.");

  const requests = isDemoMode
    ? demoStore().verifications
    : ((
        await (await getServerSupabase())!
          .from("verification_requests")
          .select("*")
          .eq("id", id)
      ).data as VerificationRequest[]) ?? [];
  const request = requests.find((r) => r.id === id);
  if (!request) return fail("That request no longer exists.");

  if (isDemoMode) {
    const store = demoStore();
    request.status = decision;
    request.notes = notes || null;
    if (decision === "verified") {
      if (request.listing_id) {
        const l = store.listings.find((x) => x.id === request.listing_id);
        if (l) l.is_verified = true;
      } else {
        const p = store.profiles.find((x) => x.id === request.user_id);
        if (p) {
          p.is_verified = true;
          p.verification_status = "verified";
        }
      }
    } else {
      const p = store.profiles.find((x) => x.id === request.user_id);
      if (p && !request.listing_id) p.verification_status = "rejected";
    }
  } else {
    const supabase = await getServerSupabase();
    await supabase!
      .from("verification_requests")
      .update({ status: decision, notes: notes || null })
      .eq("id", id);
    if (decision === "verified") {
      if (request.listing_id) {
        await supabase!
          .from("listings")
          .update({ is_verified: true })
          .eq("id", request.listing_id);
      } else {
        await supabase!
          .from("profiles")
          .update({ is_verified: true, verification_status: "verified" })
          .eq("id", request.user_id);
      }
    }
  }

  revalidatePath("/admin/verification");
  return { ok: true, message: `Request marked as ${decision}.` };
}

export async function adminSettingsAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const admin = await requireAdmin();
  if (!admin) return fail("Administrator access required.");

  const num = (key: string, fallback: number) => {
    const raw = formData.get(key);
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  };

  const current = await getSettings();
  const next = {
    ...current,
    commission_bps: Math.min(5000, Math.round(num("commissionPercent", 10) * 100)),
    featured_price_cents: Math.round(num("featuredPrice", 9) * 100),
    featured_days: Math.max(1, Math.round(num("featuredDays", 7))),
    boost_price_cents: Math.round(num("boostPrice", 5) * 100),
    boost_days: Math.max(1, Math.round(num("boostDays", 3))),
    premium_monthly_cents: Math.round(num("premiumPrice", 29) * 100),
    verification_fee_cents: Math.round(num("verificationFee", 49) * 100),
    analyzer_price_cents: Math.round(num("analyzerPrice", 19) * 100),
  };

  if (isDemoMode) {
    Object.assign(demoStore().settings, next);
  } else {
    const supabase = await getServerSupabase();
    await supabase!
      .from("platform_settings")
      .upsert({ key: "pricing", value: next }, { onConflict: "key" });
  }

  revalidatePath("/admin/settings");
  revalidatePath("/pricing");
  return { ok: true, message: "Pricing updated." };
}

// ------------------------------------------------------- business profiles

export async function createBusinessProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await currentUserOrFail();
  if (error) return error;

  const parsed = businessProfileSchema.safeParse({
    ...Object.fromEntries(formData),
    lookingFor: formData.getAll("lookingFor"),
  });
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const profile: BusinessProfile = {
    id: demoId("bp"),
    owner_id: me!.id,
    name: v.name,
    slug: `${slugify(v.name)}-${Math.random().toString(36).slice(2, 6)}`,
    logo_url: null,
    description: v.description,
    website: v.website ?? null,
    industry: v.industry,
    country: v.country,
    team: v.team.map((line) => {
      const [name, role] = line.split(/\s*[-–—:]\s*/);
      return { name: name ?? line, role: role ?? "Team" };
    }),
    products: v.products,
    services: v.services,
    goals: v.goals,
    looking_for: v.lookingFor,
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().businessProfiles.unshift(profile);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = profile;
    const { data, error: dbError } = await supabase!
      .from("business_profiles")
      .insert(insert)
      .select("slug")
      .single();
    if (dbError) return fail(dbError.message);
    profile.slug = (data as { slug: string }).slug;
  }

  revalidatePath("/business-profiles");
  return {
    ok: true,
    message: "Business profile published.",
    redirectTo: `/business-profiles/${profile.slug}`,
  };
}

// -------------------------------------------------------- AI business plan

export async function generateBusinessPlanAction(
  _prev: PlanState,
  formData: FormData,
): Promise<PlanState> {
  const parsed = businessPlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const { generatePlan } = await import("./ai/plan");
  const plan = await generatePlan(parsed.data);
  return { ok: true, plan };
}
