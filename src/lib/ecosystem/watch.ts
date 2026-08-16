import "server-only";

import { isDemoMode } from "../supabase/config";
import { getServerSupabase } from "../supabase/server";
import { demoStore } from "../demo/store";
import { formatMoney } from "../money";
import type { Listing, OpportunityAlert, WatchItem } from "../types";
import { notify } from "./notify";

/**
 * The two things that turn a saved search into something useful: telling
 * people when a new listing matches, and telling them when a listing they are
 * watching gets cheaper.
 *
 * Both run at the moment the underlying change happens — a listing being
 * approved, a price being edited — rather than on a schedule, so there is no
 * background job to keep alive and no window in which the platform knows
 * something the member has not been told.
 */

/* ---------------------------------------------------------------- alerts */

function alertMatches(alert: OpportunityAlert, listing: Listing): boolean {
  if (!alert.is_active) return false;
  if (alert.notified_listing_ids.includes(listing.id)) return false;
  if (alert.kinds.length && !alert.kinds.includes(listing.kind)) return false;
  if (alert.country && listing.country !== alert.country) return false;
  if (alert.verified_only && !listing.is_verified) return false;

  const price = listing.price_cents;
  if (alert.max_price_cents !== null) {
    // A listing with no price is "open to offers" and could land anywhere, so
    // it is not excluded by a ceiling.
    if (price !== null && price > alert.max_price_cents) return false;
  }
  if (alert.min_price_cents !== null && price !== null) {
    if (price < alert.min_price_cents) return false;
  }

  if (alert.query) {
    const words = alert.query.toLowerCase().split(/\s+/).filter(Boolean);
    const hay = [
      listing.title,
      listing.summary,
      listing.description,
      listing.category_slug,
    ]
      .join(" ")
      .toLowerCase();
    if (!words.every((w) => hay.includes(w))) return false;
  }

  return true;
}

async function allAlerts(): Promise<OpportunityAlert[]> {
  if (isDemoMode) return demoStore().alerts;
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("opportunity_alerts")
    .select("*")
    .eq("is_active", true)
    .limit(1000);
  return (data as OpportunityAlert[]) ?? [];
}

/**
 * Notifies everyone whose standing search this newly published listing fits.
 *
 * Each alert records the listings it has already fired for, so re-approving or
 * re-publishing the same listing never notifies twice.
 */
export async function runAlertsForListing(listing: Listing): Promise<number> {
  if (listing.status !== "active") return 0;

  const alerts = await allAlerts();
  let fired = 0;

  for (const alert of alerts) {
    if (alert.user_id === listing.owner_id) continue; // not your own listing
    if (!alertMatches(alert, listing)) continue;

    await notify({
      user_id: alert.user_id,
      type: "new_match",
      title: `New match for “${alert.label}”`,
      body: `${listing.title} — ${
        listing.price_cents ? formatMoney(listing.price_cents, listing.currency) : "open to offers"
      }`,
      link: `/listing/${listing.id}`,
    });

    const seen = [...alert.notified_listing_ids, listing.id].slice(-200);
    if (isDemoMode) {
      alert.notified_listing_ids = seen;
      alert.last_checked_at = new Date().toISOString();
    } else {
      const supabase = await getServerSupabase();
      await supabase!
        .from("opportunity_alerts")
        .update({
          notified_listing_ids: seen,
          last_checked_at: new Date().toISOString(),
        })
        .eq("id", alert.id);
    }
    fired += 1;
  }

  return fired;
}

/* ----------------------------------------------------------- price drops */

async function watchersOf(listingId: string): Promise<WatchItem[]> {
  if (isDemoMode) {
    return demoStore().watchlist.filter((w) => w.listing_id === listingId);
  }
  const supabase = await getServerSupabase();
  if (!supabase) return [];
  const { data } = await supabase
    .from("watchlist")
    .select("*")
    .eq("listing_id", listingId)
    .limit(1000);
  return (data as WatchItem[]) ?? [];
}

/**
 * Tells watchers when the asking price falls.
 *
 * Only drops are announced — a rise is not news anyone asked for — and the
 * price we last mentioned is stored per watcher, so a staircase of small cuts
 * produces one notification per cut rather than one per page view.
 */
export async function runPriceDropAlerts(
  listing: Listing,
  previousPriceCents: number | null,
): Promise<number> {
  const next = listing.price_cents;
  if (next === null || previousPriceCents === null) return 0;
  if (next >= previousPriceCents) return 0;

  const watchers = await watchersOf(listing.id);
  let sent = 0;

  for (const watcher of watchers) {
    const reference = watcher.last_seen_price_cents ?? watcher.price_when_added_cents;
    if (reference === null || next >= reference) continue;

    const saving = Math.round(((reference - next) / reference) * 100);
    await notify({
      user_id: watcher.user_id,
      type: "price_changed",
      title: "Price drop on your watchlist",
      body: `${listing.title} dropped from ${formatMoney(reference, listing.currency)} to ${formatMoney(next, listing.currency)} — ${saving}% lower.`,
      link: `/listing/${listing.id}`,
    });

    if (isDemoMode) {
      watcher.last_seen_price_cents = next;
    } else {
      const supabase = await getServerSupabase();
      await supabase!
        .from("watchlist")
        .update({ last_seen_price_cents: next })
        .eq("id", watcher.id);
    }
    sent += 1;
  }

  return sent;
}
