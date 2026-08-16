import "server-only";

import { cache } from "react";
import { getServerSupabase } from "./supabase/server";
import { isDemoMode } from "./supabase/config";
import { demoStore } from "./demo/store";
import { DEMO_CURRENT_USER_ID } from "./demo/seed";
import { readDemoSession } from "./auth/session";
import { applyFilters, isFeaturedNow, type ListingFilters } from "./filters";
import { DEFAULT_SETTINGS } from "./money";
import type {
  BusinessProfile,
  Conversation,
  Listing,
  ListingKind,
  ListingStatus,
  ListingWithOwner,
  Message,
  Notification,
  Offer,
  PlatformSettings,
  Profile,
  Report,
  Transaction,
  VerificationRequest,
} from "./types";

/**
 * Read side of the data layer.
 *
 * Every function resolves against Supabase when credentials are configured and
 * against the in-memory demo store otherwise. Filtering and sorting run in
 * TypeScript on both paths (see `applyFilters`) so search semantics can never
 * drift between the two — at MVP volumes the cost is negligible, and the
 * Supabase branch still pushes the status/owner predicates down to Postgres.
 */

const MAX_ROWS = 1000;

// ---------------------------------------------------------------- session

/**
 * The signed-in profile, or null.
 *
 * In demo mode this returns the seeded demo account so every authenticated
 * surface is explorable without a login.
 */
export const getCurrentUser = cache(async (): Promise<Profile | null> => {
  if (isDemoMode) {
    const session = await readDemoSession();
    const profiles = demoStore().profiles;

    // An account signed in through the code flow wins; an explicit sign-out
    // means nobody; and a visitor who has done neither keeps the seeded demo
    // identity so the marketplace is browsable on arrival.
    if (session.kind === "account") {
      return profiles.find((p) => p.id === session.accountId) ?? null;
    }
    if (session.kind === "guest") return null;
    return profiles.find((p) => p.id === DEMO_CURRENT_USER_ID) ?? null;
  }
  const supabase = await getServerSupabase();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile | null) ?? null;
});

/**
 * True only when the visitor signed in explicitly.
 *
 * In demo mode an arriving visitor is treated as the seeded account so the
 * marketplace is browsable, but that is not a real session — the sign-in and
 * sign-up pages must not redirect such a visitor away.
 */
export async function hasExplicitSession(): Promise<boolean> {
  if (isDemoMode) {
    return (await readDemoSession()).kind === "account";
  }
  const supabase = await getServerSupabase();
  if (!supabase) return false;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return !!user;
}

export async function requireAdmin(): Promise<Profile | null> {
  const me = await getCurrentUser();
  return me?.role === "admin" ? me : null;
}

// ---------------------------------------------------------------- profiles

export const getProfiles = cache(async (): Promise<Profile[]> => {
  if (isDemoMode) return demoStore().profiles;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data as Profile[]) ?? [];
});

export async function getProfile(id: string): Promise<Profile | null> {
  const all = await getProfiles();
  return all.find((p) => p.id === id) ?? null;
}

/** Placeholder profile so a missing owner never crashes a listing card. */
export function unknownProfile(id: string): Profile {
  return {
    id,
    full_name: "Unknown member",
    avatar_url: null,
    headline: null,
    bio: null,
    country: null,
    role: "user",
    is_verified: false,
    verification_status: "none",
    is_blocked: false,
    premium_tier: "free",
    created_at: new Date(0).toISOString(),
  };
}

// ---------------------------------------------------------------- listings

interface ListingQuery extends ListingFilters {
  statuses?: ListingStatus[];
  ownerId?: string;
  limit?: number;
  /** Exclude one listing — used for "similar listings" rails. */
  excludeId?: string;
}

const fetchListingRows = cache(
  async (
    statusKey: string,
    ownerId: string | null,
  ): Promise<Listing[]> => {
    const statuses = statusKey.split(",") as ListingStatus[];

    if (isDemoMode) {
      return demoStore().listings.filter(
        (l) =>
          statuses.includes(l.status) && (!ownerId || l.owner_id === ownerId),
      );
    }

    const supabase = await getServerSupabase();
    if (!supabase) return [];

    let q = supabase
      .from("listings")
      .select("*")
      .in("status", statuses)
      .limit(MAX_ROWS);
    if (ownerId) q = q.eq("owner_id", ownerId);

    const { data } = await q;
    return (data as Listing[]) ?? [];
  },
);

export async function getListings(
  query: ListingQuery = {},
): Promise<ListingWithOwner[]> {
  const { statuses = ["active"], ownerId, limit, excludeId, ...filters } = query;

  const rows = await fetchListingRows(
    [...statuses].sort().join(","),
    ownerId ?? null,
  );
  let filtered = applyFilters(rows, filters);
  if (excludeId) filtered = filtered.filter((l) => l.id !== excludeId);
  if (limit) filtered = filtered.slice(0, limit);

  return withOwners(filtered);
}

export async function withOwners(
  listings: Listing[],
): Promise<ListingWithOwner[]> {
  const profiles = await getProfiles();
  const byId = new Map(profiles.map((p) => [p.id, p]));
  return listings.map((l) => ({
    ...l,
    owner: byId.get(l.owner_id) ?? unknownProfile(l.owner_id),
  }));
}

export async function getListing(
  idOrSlug: string,
): Promise<ListingWithOwner | null> {
  const rows = await fetchListingRows(
    "draft,pending,active,rejected,sold,archived",
    null,
  );
  const found =
    rows.find((l) => l.id === idOrSlug) ?? rows.find((l) => l.slug === idOrSlug);
  if (!found) return null;
  const [withOwner] = await withOwners([found]);
  return withOwner;
}

export async function getFeaturedListings(
  limit = 6,
  kind?: ListingKind,
): Promise<ListingWithOwner[]> {
  const all = await getListings({ kind, sort: "popular" });
  const featured = all.filter(isFeaturedNow);
  // Top up with the most popular listings so the rail is never half-empty.
  const rest = all.filter((l) => !isFeaturedNow(l));
  return [...featured, ...rest].slice(0, limit);
}

export async function getSimilarListings(
  listing: Listing,
  limit = 3,
): Promise<ListingWithOwner[]> {
  const sameCategory = await getListings({
    kind: listing.kind,
    category: listing.category_slug,
    excludeId: listing.id,
    sort: "popular",
    limit,
  });
  if (sameCategory.length >= limit) return sameCategory;

  const sameKind = await getListings({
    kind: listing.kind,
    excludeId: listing.id,
    sort: "popular",
    limit: limit + sameCategory.length,
  });
  const seen = new Set(sameCategory.map((l) => l.id));
  return [...sameCategory, ...sameKind.filter((l) => !seen.has(l.id))].slice(
    0,
    limit,
  );
}

/** Per-marketplace counts for the home page and navigation. */
export async function getMarketplaceCounts(): Promise<Record<string, number>> {
  const rows = await fetchListingRows("active", null);
  const counts: Record<string, number> = {};
  for (const l of rows) counts[l.kind] = (counts[l.kind] ?? 0) + 1;
  return counts;
}

// --------------------------------------------------------------- favorites

export const getFavoriteIds = cache(
  async (userId: string): Promise<string[]> => {
    if (isDemoMode) {
      return demoStore()
        .favorites.filter((f) => f.user_id === userId)
        .map((f) => f.listing_id);
    }
    const supabase = await getServerSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from("favorites")
      .select("listing_id")
      .eq("user_id", userId);
    return (data ?? []).map((r: { listing_id: string }) => r.listing_id);
  },
);

export async function getFavoriteListings(
  userId: string,
): Promise<ListingWithOwner[]> {
  const ids = new Set(await getFavoriteIds(userId));
  if (!ids.size) return [];
  const rows = await fetchListingRows(
    "draft,pending,active,rejected,sold,archived",
    null,
  );
  return withOwners(rows.filter((l) => ids.has(l.id)));
}

// ------------------------------------------------------------------ offers

export const getOffers = cache(async (): Promise<Offer[]> => {
  if (isDemoMode) return demoStore().offers;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("offers")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data as Offer[]) ?? [];
});

export interface OfferThread {
  /** The root offer that opened the negotiation. */
  root: Offer;
  /** Root plus every counter, oldest first. */
  history: Offer[];
  latest: Offer;
  listing: ListingWithOwner | null;
  counterparty: Profile | null;
}

/**
 * Groups offers into negotiation threads by following `parent_offer_id`.
 * `role` selects whose side of the table to look at.
 */
export async function getOfferThreads(
  userId: string,
  role: "buyer" | "seller",
): Promise<OfferThread[]> {
  const all = await getOffers();
  const mine = all.filter((o) =>
    role === "buyer" ? o.buyer_id === userId : o.seller_id === userId,
  );

  const byId = new Map(all.map((o) => [o.id, o]));
  const rootOf = (o: Offer): Offer => {
    let cur = o;
    const guard = new Set<string>();
    while (cur.parent_offer_id && !guard.has(cur.id)) {
      guard.add(cur.id);
      const parent = byId.get(cur.parent_offer_id);
      if (!parent) break;
      cur = parent;
    }
    return cur;
  };

  const groups = new Map<string, Offer[]>();
  for (const o of mine) {
    const root = rootOf(o);
    const bucket = groups.get(root.id) ?? [];
    bucket.push(o);
    groups.set(root.id, bucket);
  }

  const profiles = await getProfiles();
  const threads: OfferThread[] = [];

  for (const [rootId, offers] of groups) {
    const history = [...offers].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
    const root = byId.get(rootId) ?? history[0];
    const latest = history[history.length - 1];
    const otherId = role === "buyer" ? latest.seller_id : latest.buyer_id;
    threads.push({
      root,
      history,
      latest,
      listing: await getListing(latest.listing_id),
      counterparty: profiles.find((p) => p.id === otherId) ?? null,
    });
  }

  return threads.sort(
    (a, b) =>
      new Date(b.latest.created_at).getTime() -
      new Date(a.latest.created_at).getTime(),
  );
}

// -------------------------------------------------------------- messaging

export const getConversations = cache(async (): Promise<Conversation[]> => {
  if (isDemoMode) return demoStore().conversations;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("conversations")
    .select("*")
    .order("last_message_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data as Conversation[]) ?? [];
});

export const getMessages = cache(async (): Promise<Message[]> => {
  if (isDemoMode) return demoStore().messages;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("messages")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(MAX_ROWS);
  return (data as Message[]) ?? [];
});

export interface ConversationView {
  conversation: Conversation;
  other: Profile;
  listing: ListingWithOwner | null;
  lastMessage: Message | null;
  unreadCount: number;
}

export async function getConversationViews(
  userId: string,
): Promise<ConversationView[]> {
  const [conversations, messages, profiles] = await Promise.all([
    getConversations(),
    getMessages(),
    getProfiles(),
  ]);

  const mine = conversations.filter(
    (c) => c.buyer_id === userId || c.seller_id === userId,
  );

  const views = await Promise.all(
    mine.map(async (c) => {
      const thread = messages
        .filter((m) => m.conversation_id === c.id)
        .sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
        );
      const otherId = c.buyer_id === userId ? c.seller_id : c.buyer_id;
      return {
        conversation: c,
        other: profiles.find((p) => p.id === otherId) ?? unknownProfile(otherId),
        listing: c.listing_id ? await getListing(c.listing_id) : null,
        lastMessage: thread[thread.length - 1] ?? null,
        unreadCount: thread.filter(
          (m) => m.sender_id !== userId && !m.read_at,
        ).length,
      };
    }),
  );

  return views.sort(
    (a, b) =>
      new Date(b.conversation.last_message_at).getTime() -
      new Date(a.conversation.last_message_at).getTime(),
  );
}

export async function getConversationThread(
  conversationId: string,
  userId: string,
): Promise<{ view: ConversationView; messages: Message[] } | null> {
  const views = await getConversationViews(userId);
  const view = views.find((v) => v.conversation.id === conversationId);
  if (!view) return null;

  const all = await getMessages();
  const thread = all
    .filter((m) => m.conversation_id === conversationId)
    .sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );

  return { view, messages: thread };
}

export async function getUnreadMessageCount(userId: string): Promise<number> {
  const views = await getConversationViews(userId);
  return views.reduce((n, v) => n + v.unreadCount, 0);
}

// ----------------------------------------------------------- notifications

export const getNotifications = cache(
  async (userId: string): Promise<Notification[]> => {
    if (isDemoMode) {
      return demoStore()
        .notifications.filter((n) => n.user_id === userId)
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
    }
    const supabase = await getServerSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(200);
    return (data as Notification[]) ?? [];
  },
);

// ----------------------------------------------------------- transactions

export const getTransactions = cache(async (): Promise<Transaction[]> => {
  if (isDemoMode) return demoStore().transactions;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data as Transaction[]) ?? [];
});

// --------------------------------------------------- moderation & admin

export const getReports = cache(async (): Promise<Report[]> => {
  if (isDemoMode) return demoStore().reports;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAX_ROWS);
  return (data as Report[]) ?? [];
});

export const getVerificationRequests = cache(
  async (): Promise<VerificationRequest[]> => {
    if (isDemoMode) return demoStore().verifications;
    const supabase = await getServerSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from("verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    return (data as VerificationRequest[]) ?? [];
  },
);

export const getSettings = cache(async (): Promise<PlatformSettings> => {
  if (isDemoMode) return demoStore().settings;
  const supabase = await getServerSupabase();
  if (!supabase) return DEFAULT_SETTINGS;
  const { data } = await supabase
    .from("platform_settings")
    .select("value")
    .eq("key", "pricing")
    .maybeSingle();
  return { ...DEFAULT_SETTINGS, ...((data?.value as object) ?? {}) };
});

// --------------------------------------------------------- business profiles

export const getBusinessProfiles = cache(
  async (): Promise<BusinessProfile[]> => {
    if (isDemoMode) return demoStore().businessProfiles;
    const supabase = await getServerSupabase();
    if (!supabase) return [];
    const { data } = await supabase
      .from("business_profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(MAX_ROWS);
    return (data as BusinessProfile[]) ?? [];
  },
);

export async function getBusinessProfile(
  idOrSlug: string,
): Promise<BusinessProfile | null> {
  const all = await getBusinessProfiles();
  return (
    all.find((b) => b.id === idOrSlug) ?? all.find((b) => b.slug === idOrSlug) ?? null
  );
}

// ------------------------------------------------------------- admin stats

export interface AdminStats {
  users: number;
  blockedUsers: number;
  activeListings: number;
  pendingListings: number;
  soldListings: number;
  openReports: number;
  pendingVerifications: number;
  gmvCents: number;
  feesCents: number;
  offers: number;
}

export async function getAdminStats(): Promise<AdminStats> {
  const [profiles, rows, reports, verifications, transactions, offers] =
    await Promise.all([
      getProfiles(),
      fetchListingRows("draft,pending,active,rejected,sold,archived", null),
      getReports(),
      getVerificationRequests(),
      getTransactions(),
      getOffers(),
    ]);

  const settled = transactions.filter(
    (t) => t.status === "paid" || t.status === "released",
  );

  return {
    users: profiles.length,
    blockedUsers: profiles.filter((p) => p.is_blocked).length,
    activeListings: rows.filter((l) => l.status === "active").length,
    pendingListings: rows.filter((l) => l.status === "pending").length,
    soldListings: rows.filter((l) => l.status === "sold").length,
    openReports: reports.filter((r) => r.status === "open" || r.status === "reviewing")
      .length,
    pendingVerifications: verifications.filter((v) => v.status === "pending").length,
    gmvCents: settled.reduce((n, t) => n + t.amount_cents, 0),
    feesCents: settled.reduce((n, t) => n + t.fee_cents, 0),
    offers: offers.length,
  };
}

// ------------------------------------------------------------ seller stats

export interface SellerStats {
  active: number;
  pending: number;
  sold: number;
  views: number;
  saves: number;
  openOffers: number;
  revenueCents: number;
  feesCents: number;
}

export async function getSellerStats(userId: string): Promise<SellerStats> {
  const [rows, offers, transactions] = await Promise.all([
    fetchListingRows("draft,pending,active,rejected,sold,archived", userId),
    getOffers(),
    getTransactions(),
  ]);

  const mySales = transactions.filter(
    (t) => t.seller_id === userId && (t.status === "paid" || t.status === "released"),
  );

  return {
    active: rows.filter((l) => l.status === "active").length,
    pending: rows.filter((l) => l.status === "pending").length,
    sold: rows.filter((l) => l.status === "sold").length,
    views: rows.reduce((n, l) => n + l.views_count, 0),
    saves: rows.reduce((n, l) => n + l.saves_count, 0),
    openOffers: offers.filter(
      (o) => o.seller_id === userId && o.status === "pending",
    ).length,
    revenueCents: mySales.reduce((n, t) => n + t.net_cents, 0),
    feesCents: mySales.reduce((n, t) => n + t.fee_cents, 0),
  };
}
