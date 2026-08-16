"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDemoMode } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";
import { demoId, demoStore } from "../demo/store";
import {
  getAlerts,
  getCurrentUser,
  getFounderProfile,
  getGoals,
  getListing,
  getMyBusiness,
  getReviewableTransactions,
} from "../data";
import { fieldErrors } from "../validation";
import type { ActionState } from "../action-state";
import type {
  BusinessGoal,
  BusinessMetric,
  FounderProfile,
  GoalKind,
  ListingKind,
  OpportunityAlert,
  Post,
  Review,
  WatchItem,
} from "../types";
import { notify } from "./notify";

/**
 * Writes for the ecosystem modules: watchlist, alerts, reviews, co-founder
 * profiles, goals, metrics and the network feed.
 *
 * Each module is independent — nothing here is imported by the marketplace —
 * so any of them can be extended or dropped without disturbing buying and
 * selling.
 */

function fail(message: string, errors?: Record<string, string>): ActionState {
  return { ok: false, message, errors };
}

async function meOrFail() {
  const me = await getCurrentUser();
  if (!me) return { me: null, error: fail("You need to sign in to do that.") };
  if (me.is_blocked)
    return { me: null, error: fail("Your account is suspended.") };
  return { me, error: null };
}

/* ------------------------------------------------------------- watchlist */

export async function toggleWatchAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;

  const listingId = String(formData.get("listingId") ?? "");
  const listing = await getListing(listingId);
  if (!listing) return;

  const store = demoStore();
  const rows = store.watchlist;
  const index = rows.findIndex(
    (w) => w.user_id === me.id && w.listing_id === listingId,
  );

  if (isDemoMode) {
    if (index >= 0) rows.splice(index, 1);
    else
      rows.push({
        id: demoId("w"),
        user_id: me.id,
        listing_id: listingId,
        price_when_added_cents: listing.price_cents,
        last_seen_price_cents: listing.price_cents,
        note: null,
        created_at: new Date().toISOString(),
      });
  } else {
    const supabase = await getServerSupabase();
    const { data: existing } = await supabase!
      .from("watchlist")
      .select("id")
      .eq("user_id", me.id)
      .eq("listing_id", listingId)
      .maybeSingle();

    if (existing) {
      await supabase!.from("watchlist").delete().eq("id", (existing as { id: string }).id);
    } else {
      await supabase!.from("watchlist").insert({
        user_id: me.id,
        listing_id: listingId,
        price_when_added_cents: listing.price_cents,
        last_seen_price_cents: listing.price_cents,
      });
    }
  }

  revalidatePath("/dashboard/watchlist");
  revalidatePath(`/listing/${listingId}`);
}

/* ---------------------------------------------------------------- alerts */

const alertSchema = z.object({
  label: z.string().trim().min(3, "Name the alert").max(120),
  query: z.string().trim().max(200).default(""),
  country: z.string().trim().default(""),
  maxPrice: z.string().trim().default(""),
  minPrice: z.string().trim().default(""),
});

const cents = (raw: string): number | null => {
  const clean = raw.replace(/[\s,€]/g, "");
  return clean && /^\d+(\.\d{1,2})?$/.test(clean)
    ? Math.round(parseFloat(clean) * 100)
    : null;
};

export async function createAlertAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const parsed = alertSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const kinds = formData.getAll("kind").map(String) as ListingKind[];
  if (!v.query && !kinds.length && !v.country && !v.maxPrice)
    return fail("Give the alert something to match on.");

  const alert: OpportunityAlert = {
    id: demoId("al"),
    user_id: me!.id,
    label: v.label,
    kinds,
    max_price_cents: cents(v.maxPrice),
    min_price_cents: cents(v.minPrice),
    country: v.country || null,
    query: v.query,
    verified_only: formData.get("verified") === "1",
    is_active: true,
    // Everything already listed is treated as seen, so a new alert does not
    // immediately fire for the entire back catalogue.
    notified_listing_ids: [],
    last_checked_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().alerts.push(alert);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = alert;
    const { error: dbError } = await supabase!
      .from("opportunity_alerts")
      .insert(insert);
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/dashboard/alerts");
  return { ok: true, message: "Alert saved. You will be notified on a match." };
}

export async function toggleAlertAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  const mine = (await getAlerts(me.id)).find((a) => a.id === id);
  if (!mine) return;

  if (isDemoMode) {
    mine.is_active = !mine.is_active;
  } else {
    const supabase = await getServerSupabase();
    await supabase!
      .from("opportunity_alerts")
      .update({ is_active: !mine.is_active })
      .eq("id", id);
  }
  revalidatePath("/dashboard/alerts");
}

export async function deleteAlertAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const id = String(formData.get("id") ?? "");
  if (!(await getAlerts(me.id)).some((a) => a.id === id)) return;

  if (isDemoMode) {
    const rows = demoStore().alerts;
    const index = rows.findIndex((a) => a.id === id);
    if (index >= 0) rows.splice(index, 1);
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("opportunity_alerts").delete().eq("id", id);
  }
  revalidatePath("/dashboard/alerts");
}

/* --------------------------------------------------------------- reviews */

const reviewSchema = z.object({
  transactionId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().min(4, "Give the review a headline").max(120),
  body: z
    .string()
    .trim()
    .min(30, "Say enough to be useful to the next person")
    .max(4000),
});

export async function writeReviewAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  // The transaction has to be one of this member's, completed, and not yet
  // reviewed. Re-resolved here rather than trusted from the form: this pairing
  // is the whole defence against invented reviews.
  const reviewable = await getReviewableTransactions(me!.id);
  const match = reviewable.find((r) => r.transaction.id === v.transactionId);
  if (!match)
    return fail(
      "You can only review a completed deal, and only once per deal.",
    );

  const review: Review = {
    id: demoId("r"),
    subject_type: match.role === "buyer" ? "seller" : "buyer",
    subject_id: match.counterparty.id,
    author_id: me!.id,
    transaction_id: v.transactionId,
    rating: v.rating,
    title: v.title,
    body: v.body,
    is_hidden: false,
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().reviews.unshift(review);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = review;
    const { error: dbError } = await supabase!.from("reviews").insert(insert);
    if (dbError) return fail(dbError.message);
  }

  await notify({
    user_id: match.counterparty.id,
    type: "saved_listing_update",
    title: `${me!.full_name} reviewed your deal`,
    body: `${v.rating} out of 5 — “${v.title}”`,
    link: `/members/${match.counterparty.id}`,
  });

  revalidatePath(`/members/${match.counterparty.id}`);
  revalidatePath("/dashboard/reviews");
  return { ok: true, message: "Review published. Thank you." };
}

/* ----------------------------------------------------------- co-founders */

const founderSchema = z.object({
  headline: z.string().trim().min(10, "Say what you are looking for").max(160),
  experience: z.string().trim().min(40, "Describe your experience").max(3000),
  industry: z.string().trim().min(2, "Name an industry").max(80),
  location: z.string().trim().min(2, "Where are you?").max(80),
  hoursPerWeek: z.coerce.number().int().min(1).max(80),
  building: z.string().trim().min(20, "What do you want to build?").max(2000),
  contributes: z.string().trim().min(20, "What do you bring?").max(2000),
});

const list = (raw: FormDataEntryValue | null): string[] =>
  String(raw ?? "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20);

export async function saveFounderProfileAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const parsed = founderSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const fields = {
    headline: v.headline,
    skills: list(formData.get("skills")),
    experience: v.experience,
    industry: v.industry,
    location: v.location,
    hours_per_week: v.hoursPerWeek,
    building: v.building,
    contributes: v.contributes,
    seeking: list(formData.get("seeking")),
    // An unticked checkbox sends nothing at all, so the hidden "0" that
    // precedes it is what makes turning the profile off actually work.
    is_open: formData.getAll("isOpen").includes("1"),
  };

  const existing = await getFounderProfile(me!.id);

  if (isDemoMode) {
    if (existing) Object.assign(existing, fields);
    else
      demoStore().founders.unshift({
        id: demoId("f"),
        user_id: me!.id,
        created_at: new Date().toISOString(),
        ...fields,
      } as FounderProfile);
  } else {
    const supabase = await getServerSupabase();
    const { error: dbError } = existing
      ? await supabase!
          .from("founder_profiles")
          .update(fields)
          .eq("id", existing.id)
      : await supabase!
          .from("founder_profiles")
          .insert({ user_id: me!.id, ...fields });
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/co-founders");
  return {
    ok: true,
    message: existing ? "Profile updated." : "Profile published.",
    redirectTo: "/co-founders",
  };
}

/* ----------------------------------------------------------------- goals */

const goalSchema = z.object({
  kind: z.enum(["revenue", "customers", "products", "growth", "team"]),
  label: z.string().trim().min(3, "Name the goal").max(120),
  target: z.string().trim().min(1, "Set a target"),
  current: z.string().trim().default("0"),
});

/** Money goals are stored in cents; counts are stored as they are typed. */
const goalNumber = (kind: GoalKind, raw: string): number | null => {
  const clean = raw.replace(/[\s,€%]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return null;
  const value = parseFloat(clean);
  return kind === "revenue" ? Math.round(value * 100) : Math.round(value);
};

export async function saveGoalAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const business = await getMyBusiness(me!.id);
  if (!business) return fail("Create your business profile first.");

  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const target = goalNumber(v.kind, v.target);
  const current = goalNumber(v.kind, v.current || "0");
  if (target === null) return fail("Enter a number for the target.", { target: "Numbers only" });
  if (current === null) return fail("Enter a number for progress.", { current: "Numbers only" });

  const id = String(formData.get("id") ?? "");
  const existing = id ? (await getGoals(business.id)).find((g) => g.id === id) : null;

  const fields = {
    kind: v.kind,
    label: v.label,
    target,
    current,
    unit: v.kind === "revenue" ? "EUR" : v.kind,
    due_on: String(formData.get("dueOn") || "") || null,
  };

  if (isDemoMode) {
    if (existing) Object.assign(existing, fields);
    else
      demoStore().goals.push({
        id: demoId("g"),
        business_id: business.id,
        created_at: new Date().toISOString(),
        ...fields,
      } as BusinessGoal);
  } else {
    const supabase = await getServerSupabase();
    const { error: dbError } = existing
      ? await supabase!.from("business_goals").update(fields).eq("id", existing.id)
      : await supabase!
          .from("business_goals")
          .insert({ business_id: business.id, ...fields });
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/workspace/goals");
  return { ok: true, message: existing ? "Goal updated." : "Goal added." };
}

export async function deleteGoalAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;
  const business = await getMyBusiness(me.id);
  if (!business) return;

  const id = String(formData.get("id") ?? "");
  if (!(await getGoals(business.id)).some((g) => g.id === id)) return;

  if (isDemoMode) {
    const rows = demoStore().goals;
    const index = rows.findIndex((g) => g.id === id);
    if (index >= 0) rows.splice(index, 1);
  } else {
    const supabase = await getServerSupabase();
    await supabase!.from("business_goals").delete().eq("id", id);
  }
  revalidatePath("/workspace/goals");
}

/* --------------------------------------------------------------- metrics */

const metricSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Pick a month"),
  revenue: z.string().trim().default("0"),
  expenses: z.string().trim().default("0"),
  customers: z.coerce.number().int().min(0).max(10_000_000).default(0),
});

export async function saveMetricAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const business = await getMyBusiness(me!.id);
  if (!business) return fail("Create your business profile first.");

  const parsed = metricSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));
  const v = parsed.data;

  const money = (raw: string): number => {
    const clean = raw.replace(/[\s,€]/g, "");
    return /^\d+(\.\d{1,2})?$/.test(clean) ? Math.round(parseFloat(clean) * 100) : 0;
  };

  const fields = {
    revenue_cents: money(v.revenue),
    expenses_cents: money(v.expenses),
    customers: v.customers,
  };

  if (isDemoMode) {
    const rows = demoStore().metrics;
    const existing = rows.find(
      (m) => m.business_id === business.id && m.month === v.month,
    );
    if (existing) Object.assign(existing, fields);
    else
      rows.push({
        id: demoId("bm"),
        business_id: business.id,
        month: v.month,
        created_at: new Date().toISOString(),
        ...fields,
      } as BusinessMetric);
  } else {
    const supabase = await getServerSupabase();
    // One row per business per month; re-saving a month overwrites it.
    const { error: dbError } = await supabase!
      .from("business_metrics")
      .upsert(
        { business_id: business.id, month: v.month, ...fields },
        { onConflict: "business_id,month" },
      );
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/workspace/metrics");
  return { ok: true, message: `Figures saved for ${v.month}.` };
}

/* --------------------------------------------------------------- network */

export async function toggleFollowAction(formData: FormData) {
  const me = await getCurrentUser();
  if (!me) return;

  const targetType = String(formData.get("targetType") ?? "member") as
    | "member"
    | "business";
  const targetId = String(formData.get("targetId") ?? "");
  if (!targetId || targetId === me.id) return;

  if (isDemoMode) {
    const rows = demoStore().follows;
    const index = rows.findIndex(
      (f) =>
        f.follower_id === me.id &&
        f.target_type === targetType &&
        f.target_id === targetId,
    );
    if (index >= 0) rows.splice(index, 1);
    else
      rows.push({
        id: demoId("fo"),
        follower_id: me.id,
        target_type: targetType,
        target_id: targetId,
        created_at: new Date().toISOString(),
      });
  } else {
    const supabase = await getServerSupabase();
    const { data: existing } = await supabase!
      .from("follows")
      .select("id")
      .eq("follower_id", me.id)
      .eq("target_type", targetType)
      .eq("target_id", targetId)
      .maybeSingle();

    if (existing)
      await supabase!.from("follows").delete().eq("id", (existing as { id: string }).id);
    else
      await supabase!.from("follows").insert({
        follower_id: me.id,
        target_type: targetType,
        target_id: targetId,
      });
  }

  revalidatePath("/network");
  revalidatePath(`/members/${targetId}`);
}

const postSchema = z.object({
  body: z.string().trim().min(20, "Write something worth reading").max(2000),
  kind: z.enum(["update", "opportunity", "milestone"]).default("update"),
});

export async function createPostAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { me, error } = await meOrFail();
  if (error) return error;

  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success)
    return fail("Please fix the highlighted fields.", fieldErrors(parsed.error));

  const business = await getMyBusiness(me!.id);
  const post: Post = {
    id: demoId("po"),
    author_id: me!.id,
    business_id: business?.id ?? null,
    kind: parsed.data.kind,
    body: parsed.data.body,
    link: business ? `/business-profiles/${business.slug}` : null,
    link_label: business?.name ?? null,
    created_at: new Date().toISOString(),
  };

  if (isDemoMode) {
    demoStore().posts.unshift(post);
  } else {
    const supabase = await getServerSupabase();
    const { id: _id, ...insert } = post;
    const { error: dbError } = await supabase!.from("posts").insert(insert);
    if (dbError) return fail(dbError.message);
  }

  revalidatePath("/network");
  return { ok: true, message: "Posted." };
}
