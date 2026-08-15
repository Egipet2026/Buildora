import { Suspense } from "react";
import { FilterPanel } from "./filter-panel";
import { ListingGrid } from "./listing-card";
import { EmptyState, Notice, PageHeader } from "./ui";
import { getCurrentUser, getFavoriteIds, getListings } from "@/lib/data";
import { parseFilters } from "@/lib/filters";
import type { ListingKind } from "@/lib/types";

export type SearchParams = Record<string, string | string[] | undefined>;

/**
 * Shared browse page for every marketplace. Each marketplace route supplies
 * its own copy and fixed `kind`; the filtering, sorting and empty states are
 * identical everywhere so behaviour never drifts between sections.
 */
export async function BrowsePage({
  kind,
  eyebrow,
  title,
  description,
  notice,
  searchParams,
  basePath,
  showFinancials = false,
  showDealTypes = false,
  children,
}: {
  kind?: ListingKind;
  eyebrow: string;
  title: string;
  description: string;
  notice?: React.ReactNode;
  searchParams: SearchParams;
  basePath: string;
  showFinancials?: boolean;
  showDealTypes?: boolean;
  children?: React.ReactNode;
}) {
  const filters = parseFilters(searchParams);
  const me = await getCurrentUser();

  const [listings, savedIds] = await Promise.all([
    getListings({ ...filters, kind: kind ?? filters.kind }),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
  ]);

  return (
    <>
      <PageHeader eyebrow={eyebrow} title={title} description={description} />

      <div className="shell py-10">
        {notice ? <div className="mb-8">{notice}</div> : null}
        {children}

        <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
          <Suspense
            fallback={<div className="card h-96 animate-pulse" aria-hidden />}
          >
            <FilterPanel
              kind={kind}
              showFinancials={showFinancials}
              showDealTypes={showDealTypes}
              resultCount={listings.length}
            />
          </Suspense>

          <div>
            {listings.length ? (
              <ListingGrid
                listings={listings}
                savedIds={savedIds}
                redirectTo={basePath}
                columns={3}
              />
            ) : (
              <EmptyState
                icon="⌕"
                title="Nothing matches those filters"
                description="Try widening the price range, clearing the country filter, or removing the verified-only requirement."
                action={{ href: basePath, label: "Clear filters" }}
              />
            )}

            {listings.length ? (
              <div className="mt-8">
                <Notice tone="neutral">
                  Listings are submitted by their sellers. BizHub reviews them
                  before publication but does not independently confirm every
                  claim. Verify financials, ownership and rights yourself before
                  committing to anything.
                </Notice>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
