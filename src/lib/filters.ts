import type { Listing, ListingKind } from "./types";
import { MARKETPLACES } from "./taxonomy";

export type SortKey =
  | "newest"
  | "cheapest"
  | "expensive"
  | "popular"
  | "profitable";

export const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest first" },
  { key: "cheapest", label: "Price: low to high" },
  { key: "expensive", label: "Price: high to low" },
  { key: "popular", label: "Most popular" },
  { key: "profitable", label: "Most profitable" },
];

export interface ListingFilters {
  q?: string;
  kind?: ListingKind;
  category?: string;
  country?: string;
  minPrice?: number; // cents
  maxPrice?: number; // cents
  minRevenue?: number; // cents / year
  minProfit?: number; // cents / year
  minYear?: number;
  online?: "online" | "offline";
  verified?: boolean;
  featured?: boolean;
  dealType?: string;
  sort?: SortKey;
}

/** Reads filters out of a Next.js `searchParams` object. */
export function parseFilters(
  sp: Record<string, string | string[] | undefined>,
): ListingFilters {
  const one = (k: string) => {
    const v = sp[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const num = (k: string) => {
    const v = one(k);
    if (!v) return undefined;
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  };
  const euro = (k: string) => {
    const n = num(k);
    return n === undefined ? undefined : Math.round(n * 100);
  };

  const sort = one("sort") as SortKey | undefined;

  return {
    q: one("q")?.trim() || undefined,
    kind: one("kind") as ListingKind | undefined,
    category: one("category") || undefined,
    country: one("country") || undefined,
    minPrice: euro("minPrice"),
    maxPrice: euro("maxPrice"),
    minRevenue: euro("minRevenue"),
    minProfit: euro("minProfit"),
    minYear: num("minYear"),
    online: one("online") as "online" | "offline" | undefined,
    verified: one("verified") === "1" || one("verified") === "true",
    featured: one("featured") === "1" || one("featured") === "true",
    dealType: one("dealType") || undefined,
    sort: SORT_OPTIONS.some((o) => o.key === sort) ? sort : "newest",
  };
}

/** Serialises filters back into a query string, dropping empty values. */
export function filtersToQuery(f: ListingFilters): string {
  const p = new URLSearchParams();
  const cents = (n?: number) => (n === undefined ? undefined : String(n / 100));
  const put = (k: string, v?: string | number | boolean) => {
    if (v === undefined || v === "" || v === false) return;
    p.set(k, v === true ? "1" : String(v));
  };
  put("q", f.q);
  put("kind", f.kind);
  put("category", f.category);
  put("country", f.country);
  put("minPrice", cents(f.minPrice));
  put("maxPrice", cents(f.maxPrice));
  put("minRevenue", cents(f.minRevenue));
  put("minProfit", cents(f.minProfit));
  put("minYear", f.minYear);
  put("online", f.online);
  put("verified", f.verified);
  put("featured", f.featured);
  put("dealType", f.dealType);
  if (f.sort && f.sort !== "newest") put("sort", f.sort);
  return p.toString();
}

/** Count of active filters, used for the "Clear all" affordance. */
export function activeFilterCount(f: ListingFilters): number {
  const keys: (keyof ListingFilters)[] = [
    "category",
    "country",
    "minPrice",
    "maxPrice",
    "minRevenue",
    "minProfit",
    "minYear",
    "online",
    "dealType",
  ];
  let n = keys.filter((k) => f[k] !== undefined && f[k] !== "").length;
  if (f.verified) n += 1;
  if (f.featured) n += 1;
  return n;
}

function haystack(l: Listing): string {
  return [
    l.title,
    l.summary,
    l.description,
    l.country,
    l.category_slug,
    l.attributes.business_model,
    l.attributes.technology_field,
    l.attributes.patent_number,
    l.attributes.rights_holder,
    ...(l.attributes.skills ?? []),
    ...(l.attributes.tech_stack ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function isBoosted(l: Listing): boolean {
  return !!l.boosted_until && new Date(l.boosted_until).getTime() > Date.now();
}

export function isFeaturedNow(l: Listing): boolean {
  if (!l.is_featured) return false;
  return !l.featured_until || new Date(l.featured_until).getTime() > Date.now();
}

export function applyFilters(
  listings: Listing[],
  f: ListingFilters,
): Listing[] {
  const terms = f.q
    ? f.q.toLowerCase().split(/\s+/).filter((t) => t.length > 1)
    : [];

  const out = listings.filter((l) => {
    if (f.kind && l.kind !== f.kind) return false;
    if (f.category && l.category_slug !== f.category) return false;
    if (f.country && l.country !== f.country) return false;
    if (f.minPrice !== undefined && l.price_cents < f.minPrice) return false;
    if (f.maxPrice !== undefined && l.price_cents > f.maxPrice) return false;
    if (
      f.minRevenue !== undefined &&
      (l.metrics.annual_revenue_cents ?? 0) < f.minRevenue
    )
      return false;
    if (
      f.minProfit !== undefined &&
      (l.metrics.annual_profit_cents ?? 0) < f.minProfit
    )
      return false;
    if (
      f.minYear !== undefined &&
      (l.attributes.year_founded ?? 0) < f.minYear
    )
      return false;
    if (f.online === "online" && l.attributes.is_online !== true) return false;
    if (f.online === "offline" && l.attributes.is_online !== false) return false;
    if (f.verified && !l.is_verified) return false;
    if (f.featured && !isFeaturedNow(l)) return false;
    if (f.dealType && !l.deal_types.includes(f.dealType as never)) return false;

    if (terms.length) {
      const hay = haystack(l);
      // Every term must appear somewhere — narrow beats noisy for search.
      if (!terms.every((t) => hay.includes(t))) return false;
    }
    return true;
  });

  return sortListings(out, f.sort ?? "newest");
}

export function sortListings(listings: Listing[], sort: SortKey): Listing[] {
  const out = [...listings];
  const time = (l: Listing) =>
    new Date(l.published_at ?? l.created_at).getTime();

  switch (sort) {
    case "cheapest":
      out.sort((a, b) => a.price_cents - b.price_cents);
      break;
    case "expensive":
      out.sort((a, b) => b.price_cents - a.price_cents);
      break;
    case "popular":
      out.sort(
        (a, b) =>
          b.views_count + b.saves_count * 8 - (a.views_count + a.saves_count * 8),
      );
      break;
    case "profitable":
      out.sort(
        (a, b) =>
          (b.metrics.annual_profit_cents ?? -1) -
          (a.metrics.annual_profit_cents ?? -1),
      );
      break;
    default:
      out.sort((a, b) => time(b) - time(a));
  }

  // Paid placement floats to the top *within* the chosen ordering, so a
  // "cheapest first" sort still respects the user's intent.
  return out.sort((a, b) => rank(b) - rank(a));
}

function rank(l: Listing): number {
  return (isFeaturedNow(l) ? 2 : 0) + (isBoosted(l) ? 1 : 0);
}

/**
 * Turns a plain-language query into structured filters.
 *
 * "I want a SaaS business under €20,000" →
 *   { kind: "business", category: "saas", maxPrice: 2_000_000 }
 *
 * Deliberately rule-based: it is predictable, needs no third-party service,
 * and degrades to keyword search when nothing matches.
 */
export function parseSmartQuery(input: string): ListingFilters {
  const text = input.toLowerCase();
  const filters: ListingFilters = { sort: "newest" };

  // Price bounds — supports €20,000 / 20k / 20 000 / $20000.
  const amount = (s: string): number => {
    const cleaned = s.replace(/[^0-9km.,]/g, "").replace(/,/g, "");
    const mult = /k$/.test(cleaned) ? 1_000 : /m$/.test(cleaned) ? 1_000_000 : 1;
    const n = parseFloat(cleaned.replace(/[km]$/, ""));
    return Number.isFinite(n) ? Math.round(n * mult * 100) : 0;
  };

  const under = text.match(
    /(?:under|below|less than|up to|max(?:imum)?|cheaper than)\s*[€$£]?\s*([0-9][0-9.,\s]*[km]?)/,
  );
  if (under) filters.maxPrice = amount(under[1]);

  const over = text.match(
    /(?:over|above|more than|at least|min(?:imum)?|from)\s*[€$£]?\s*([0-9][0-9.,\s]*[km]?)/,
  );
  if (over) filters.minPrice = amount(over[1]);

  const profit = text.match(
    /profit(?:able)?\s*(?:of|over|above|at least)?\s*[€$£]?\s*([0-9][0-9.,\s]*[km]?)/,
  );
  if (profit) filters.minProfit = amount(profit[1]);

  // Marketplace kind.
  const kindHints: [ListingKind, RegExp][] = [
    ["patent", /\b(patent|patents|intellectual property|\bip\b|licen[cs]e|technolog)/],
    ["service", /\b(freelancer|specialist|expert|consultant|developer|designer|lawyer|accountant|hire)/],
    ["partner", /\b(partner|co-?founder|cofounder)/],
    ["digital_asset", /\b(domain|website|app|source code|api|template|saas asset)/],
    ["idea", /\b(idea|concept)/],
    ["ai_tool", /\b(ai tool|agent|automation)/],
    ["marketing", /\b(marketing|seo|ads|advertis)/],
    ["product", /\b(supplier|manufactur|wholesale|packaging)/],
    ["business", /\b(business|company|store|shop|agency|startup|acquisition|acquire|buy a)/],
  ];
  for (const [kind, re] of kindHints) {
    if (re.test(text)) {
      filters.kind = kind;
      break;
    }
  }

  // Category, matched within the chosen marketplace when we have one.
  const pools = filters.kind
    ? MARKETPLACES.filter((m) => m.kind === filters.kind)
    : MARKETPLACES;
  outer: for (const m of pools) {
    for (const c of m.categories) {
      if (c.name.toLowerCase() === "other") continue;
      if (text.includes(c.name.toLowerCase())) {
        filters.category = c.slug;
        filters.kind ??= m.kind;
        break outer;
      }
    }
  }

  if (/\bverified\b/.test(text)) filters.verified = true;
  if (/\bonline\b/.test(text)) filters.online = "online";
  if (/\b(offline|physical|local|brick)\b/.test(text)) filters.online = "offline";
  if (/\bcheap(est)?\b/.test(text)) filters.sort = "cheapest";
  if (/\bmost profitable\b/.test(text)) filters.sort = "profitable";

  // Leftover words become the keyword query so nothing is silently dropped.
  const stop = new Set([
    "i", "want", "a", "an", "the", "to", "buy", "for", "with", "under", "over",
    "below", "above", "less", "more", "than", "up", "looking", "find", "me",
    "business", "businesses", "and", "or", "of", "in", "is", "any", "some",
    "please", "show", "search", "at", "least", "max", "maximum", "min",
    "minimum", "profitable", "profit", "verified", "online", "offline",
  ]);
  const rest = text
    .replace(/[€$£]/g, " ")
    .split(/[^a-z0-9.]+/)
    .filter((w) => w.length > 2 && !stop.has(w) && !/^[0-9.]+[km]?$/.test(w));
  if (rest.length) filters.q = rest.join(" ");

  return filters;
}
