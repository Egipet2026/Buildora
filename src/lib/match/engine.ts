import type { Listing, ListingKind, ListingWithOwner } from "../types";

/**
 * Scoring shared by BizMatch, the recommendation strip and opportunity alerts.
 *
 * It is deliberately explainable rather than clever: every point comes from a
 * named rule, and each rule that fires contributes a sentence. A member should
 * always be able to see why something scored 92% — a number nobody can account
 * for is worse than no number at all.
 *
 * The score is a fit signal, never a quality judgement. Nothing here knows
 * whether a business is any good.
 */

export interface MatchCriteria {
  /** Upper limit of what the member can spend, in cents. */
  budgetCents?: number;
  /** Lower limit, for members who consider very cheap listings a red flag. */
  minBudgetCents?: number;
  country?: string;
  /** Free text: interests, what they want to do, anything at all. */
  interests?: string;
  /** Free text: what they can already do. */
  skills?: string;
  industry?: string;
  online?: "online" | "offline";
  /** Rough size band, judged on revenue. */
  size?: "small" | "medium" | "large";
  /** Which marketplaces to consider. Empty means all of them. */
  kinds?: ListingKind[];
  verifiedOnly?: boolean;
}

export interface MatchResult {
  listing: ListingWithOwner;
  /** 0–100. Capped, so nothing ever claims a perfect fit. */
  score: number;
  reasons: string[];
  /** Things that count against it, shown alongside the score. */
  cautions: string[];
}

const SIZE_BANDS: Record<string, { min: number; max: number; label: string }> = {
  small: { min: 0, max: 100_000_00, label: "under €100k of annual revenue" },
  medium: {
    min: 100_000_00,
    max: 1_000_000_00,
    label: "€100k–€1M of annual revenue",
  },
  large: { min: 1_000_000_00, max: Infinity, label: "over €1M of annual revenue" },
};

/** Words that carry no signal when matching free text against a listing. */
const STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "into", "want", "would",
  "like", "some", "have", "business", "businesses", "company", "looking", "need",
  "about", "just", "very", "make", "made", "them", "they", "their", "your",
]);

function tokenise(text: string): string[] {
  return [
    ...new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9+]+/)
        .filter((w) => w.length > 3 && !STOP_WORDS.has(w)),
    ),
  ];
}

function haystack(listing: Listing): string {
  return [
    listing.title,
    listing.summary,
    listing.description,
    listing.category_slug,
    listing.attributes.technology_field ?? "",
    (listing.attributes.skills ?? []).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

const annualRevenue = (l: Listing): number =>
  l.metrics.annual_revenue_cents ??
  (l.metrics.monthly_revenue_cents ? l.metrics.monthly_revenue_cents * 12 : 0);

/**
 * Scores one listing against the criteria.
 *
 * Weights are the honest part of this file: budget and country dominate
 * because they are hard constraints for most buyers, while text overlap is
 * worth less because it is the least reliable signal.
 */
export function scoreListing(
  listing: ListingWithOwner,
  criteria: MatchCriteria,
): MatchResult {
  const reasons: string[] = [];
  const cautions: string[] = [];

  // Start everyone at a low base so an empty form does not rank things at 0%.
  let score = 30;
  let possible = 30;

  /* ------------------------------------------------------------- budget */
  if (criteria.budgetCents) {
    possible += 25;
    const price = listing.price_cents;
    if (!price) {
      score += 12;
      reasons.push("Open to offers, so your budget may still work");
    } else if (price <= criteria.budgetCents) {
      const headroom = 1 - price / criteria.budgetCents;
      // Comfortably inside budget scores best; right at the limit still counts.
      score += 18 + Math.round(headroom * 7);
      reasons.push(
        headroom > 0.35
          ? "Well inside your budget, leaving room for working capital"
          : "Within your budget",
      );
    } else if (price <= criteria.budgetCents * 1.25) {
      score += 8;
      cautions.push("Slightly above your budget — you would need to negotiate");
    } else {
      cautions.push("Above your budget");
    }
  }

  if (criteria.minBudgetCents && listing.price_cents) {
    if (listing.price_cents < criteria.minBudgetCents) {
      cautions.push("Cheaper than the range you set — check why");
    }
  }

  /* ------------------------------------------------------------ country */
  if (criteria.country) {
    possible += 15;
    if (listing.country === criteria.country) {
      score += 15;
      reasons.push(`Based in ${listing.country}, where you want to operate`);
    } else if (listing.attributes.is_online) {
      score += 10;
      reasons.push("Runs online, so location matters less");
    } else {
      cautions.push(`Based in ${listing.country}, not ${criteria.country}`);
    }
  }

  /* ----------------------------------------------------------- industry */
  if (criteria.industry) {
    possible += 12;
    const wanted = criteria.industry.toLowerCase();
    if (
      listing.category_slug.toLowerCase().includes(wanted) ||
      haystack(listing).includes(wanted)
    ) {
      score += 12;
      reasons.push(`In ${criteria.industry}, the industry you asked for`);
    }
  }

  /* ------------------------------------------------- interests & skills */
  const text = [criteria.interests, criteria.skills].filter(Boolean).join(" ");
  if (text) {
    possible += 18;
    const words = tokenise(text);
    const hay = haystack(listing);
    const hits = words.filter((w) => hay.includes(w));
    if (hits.length) {
      score += Math.min(18, hits.length * 6);
      const shown = hits.slice(0, 3).join(", ");
      reasons.push(
        criteria.skills && tokenise(criteria.skills).some((w) => hay.includes(w))
          ? `Uses what you already know — ${shown}`
          : `Matches your interest in ${shown}`,
      );
    }
  }

  /* --------------------------------------------------------- online-ness */
  if (criteria.online) {
    possible += 8;
    const isOnline = listing.attributes.is_online;
    if (isOnline === undefined) {
      score += 3;
    } else if ((criteria.online === "online") === isOnline) {
      score += 8;
      reasons.push(criteria.online === "online" ? "Fully online" : "Has a physical presence");
    } else {
      cautions.push(
        criteria.online === "online"
          ? "Needs a physical presence"
          : "Online only, with no premises",
      );
    }
  }

  /* ---------------------------------------------------------------- size */
  if (criteria.size) {
    possible += 10;
    const band = SIZE_BANDS[criteria.size];
    const revenue = annualRevenue(listing);
    if (revenue > 0 && revenue >= band.min && revenue < band.max) {
      score += 10;
      reasons.push(`Around the size you wanted — ${band.label}`);
    } else if (revenue === 0) {
      score += 3;
    }
  }

  /* ------------------------------------------------------------- signals */
  if (criteria.verifiedOnly) {
    possible += 10;
    if (listing.is_verified) {
      score += 10;
      reasons.push("Details evidenced to Buildora and checked");
    } else {
      cautions.push("Not verified — the seller's figures are unchecked");
    }
  } else if (listing.is_verified) {
    score += 4;
    possible += 4;
    reasons.push("Verified seller details");
  }

  // Profitability is a fit signal for anyone buying rather than building.
  const profit = listing.metrics.annual_profit_cents ?? 0;
  if (profit > 0 && listing.price_cents) {
    const multiple = listing.price_cents / profit;
    if (multiple > 0 && multiple <= 3) {
      score += 5;
      possible += 5;
      reasons.push(`Priced at about ${multiple.toFixed(1)}× annual profit`);
    }
  }

  const percent = Math.max(
    5,
    Math.min(97, Math.round((score / Math.max(possible, 1)) * 100)),
  );

  return { listing, score: percent, reasons, cautions };
}

/**
 * Ranks a set of listings, dropping anything that clearly does not fit.
 *
 * The floor exists so the page never pads itself out with irrelevant results
 * to look busy — an honest three matches beat a padded twenty.
 */
export function rankMatches(
  listings: ListingWithOwner[],
  criteria: MatchCriteria,
  { limit = 24, floor = 45 }: { limit?: number; floor?: number } = {},
): MatchResult[] {
  const kinds = criteria.kinds?.length ? new Set(criteria.kinds) : null;

  return listings
    .filter((l) => (kinds ? kinds.has(l.kind) : true))
    .map((l) => scoreListing(l, criteria))
    .filter((m) => m.score >= floor)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

/** Wording for the score, so the number is never presented bare. */
export function matchLabel(score: number): string {
  if (score >= 85) return "Strong fit";
  if (score >= 70) return "Good fit";
  if (score >= 55) return "Possible fit";
  return "Loose fit";
}
