import "server-only";

import { getFavoriteListings, getListings, getWatchlist } from "../data";
import { rankMatches, type MatchCriteria, type MatchResult } from "./engine";

/**
 * "Recommended for you", built from what the member has actually done.
 *
 * Only two signals are used: the listings they saved and the ones they are
 * watching. Both are deliberate acts, unlike a page view, and both are visible
 * to the member — so the recommendation can be explained in one sentence and
 * turned off by unsaving something.
 *
 * With no history it returns nothing. A strip of "recommendations" for someone
 * the platform knows nothing about is just advertising with a friendlier
 * label.
 */
export async function recommendFor(
  userId: string | null,
  savedIds: string[],
): Promise<MatchResult[]> {
  if (!userId || !savedIds.length) return [];

  const [saved, watching] = await Promise.all([
    getFavoriteListings(userId),
    getWatchlist(userId),
  ]);

  const history = [...saved, ...watching.map((w) => w.listing)];
  if (!history.length) return [];

  const priced = history.filter((l) => l.price_cents > 0);
  const typical = priced.length
    ? priced.reduce((sum, l) => sum + l.price_cents, 0) / priced.length
    : 0;

  // Countries and categories they keep coming back to.
  const tally = (values: string[]) => {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  };

  const criteria: MatchCriteria = {
    // Room to move above what they have looked at, not a hard ceiling.
    budgetCents: typical ? Math.round(typical * 1.4) : undefined,
    country: tally(history.map((l) => l.country)),
    industry: tally(history.map((l) => l.category_slug))?.replace(/-/g, " "),
    interests: history
      .slice(0, 6)
      .map((l) => `${l.title} ${l.summary}`)
      .join(" "),
    kinds: [...new Set(history.map((l) => l.kind))],
  };

  const seen = new Set(history.map((l) => l.id));
  const pool = (await getListings({ limit: 300 })).filter(
    (l) => !seen.has(l.id) && l.owner_id !== userId,
  );

  return rankMatches(pool, criteria, { limit: 3, floor: 55 });
}
