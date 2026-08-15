import Link from "next/link";
import { GlobalSearch } from "@/components/global-search";
import { ListingGrid } from "@/components/listing-card";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import { getCurrentUser, getFavoriteIds, getListings } from "@/lib/data";
import { filtersToQuery, parseSmartQuery } from "@/lib/filters";
import { categoryName, MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import { formatMoney } from "@/lib/money";
import type { SearchParams } from "@/components/browse";

export const metadata = { title: "Search" };

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const raw = (Array.isArray(sp.q) ? sp.q[0] : sp.q)?.trim() ?? "";

  const filters = raw ? parseSmartQuery(raw) : {};
  const me = await getCurrentUser();
  const [listings, savedIds] = await Promise.all([
    raw ? getListings(filters) : Promise.resolve([]),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
  ]);

  // What the parser understood, shown back so the result set is explainable.
  const chips: string[] = [];
  if (filters.kind) chips.push(MARKETPLACE_BY_KIND[filters.kind].name);
  if (filters.category && filters.kind)
    chips.push(categoryName(filters.kind, filters.category));
  if (filters.maxPrice !== undefined)
    chips.push(`under ${formatMoney(filters.maxPrice)}`);
  if (filters.minPrice !== undefined)
    chips.push(`over ${formatMoney(filters.minPrice)}`);
  if (filters.minProfit !== undefined)
    chips.push(`profit over ${formatMoney(filters.minProfit)}`);
  if (filters.country) chips.push(filters.country);
  if (filters.verified) chips.push("verified only");
  if (filters.online) chips.push(filters.online);
  if (filters.q) chips.push(`keywords: ${filters.q}`);

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={raw ? `Results for “${raw}”` : "Search BizHub"}
        description="Describe what you want in plain language. BizHub turns it into filters — marketplace, category, price range and more — and you can adjust them afterwards."
      />

      <div className="shell py-10">
        <div className="mx-auto max-w-3xl">
          <GlobalSearch defaultValue={raw} />
        </div>

        {raw ? (
          <div className="mt-10">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <span className="text-[0.8125rem] text-[var(--color-ink-3)]">
                Understood as:
              </span>
              {chips.length ? (
                chips.map((chip) => (
                  <span key={chip} className="badge badge-brand">
                    {chip}
                  </span>
                ))
              ) : (
                <span className="badge badge-neutral">a keyword search</span>
              )}
              <Link
                href={`/marketplace?${filtersToQuery(filters)}`}
                className="ml-auto text-[0.8125rem] font-medium text-[var(--color-brand)] hover:underline"
              >
                Refine these filters →
              </Link>
            </div>

            {listings.length ? (
              <>
                <p className="mb-5 text-[0.875rem] text-[var(--color-ink-2)]">
                  {listings.length}{" "}
                  {listings.length === 1 ? "listing" : "listings"} found.
                </p>
                <ListingGrid
                  listings={listings}
                  savedIds={savedIds}
                  redirectTo={`/search?q=${encodeURIComponent(raw)}`}
                />
              </>
            ) : (
              <EmptyState
                icon="⌕"
                title="No listings match that search"
                description="Try a broader price range, a different category, or fewer words. You can also browse a marketplace directly."
                action={{ href: "/marketplace", label: "Browse everything" }}
              />
            )}

            <div className="mt-8">
              <Notice tone="neutral">
                Search reads your query with deterministic rules — it never
                invents listings and never reorders results in exchange for
                payment beyond the Featured and Boost placements, which are
                always labelled.
              </Notice>
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
