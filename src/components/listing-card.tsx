import Link from "next/link";
import { Cover } from "./ui";
import { FavoriteButton } from "./favorite-button";
import { formatMoney, formatMoneyCompact, profitMultiple, timeAgo } from "@/lib/money";
import { categoryName, MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import { isFeaturedNow } from "@/lib/filters";
import type { ListingWithOwner } from "@/lib/types";

/** The headline price line — a licence-only listing has no purchase price. */
export function priceLabel(listing: ListingWithOwner): {
  main: string;
  sub?: string;
} {
  const licence = listing.attributes.license_price_cents;
  const period = listing.attributes.license_period ?? "year";
  const purchasable = listing.deal_types.includes("purchase");

  if (!purchasable && licence) {
    return { main: `${formatMoney(licence, listing.currency)}`, sub: `per ${period}` };
  }
  if (listing.price_cents === 0) {
    return { main: "Open to offers" };
  }

  const base = { main: formatMoney(listing.price_cents, listing.currency) };
  if (listing.kind === "service") {
    return { ...base, sub: `per ${listing.attributes.rate_unit ?? "project"}` };
  }
  if (licence) {
    return {
      ...base,
      sub: `or licence ${formatMoneyCompact(licence, listing.currency)}/${period}`,
    };
  }
  return base;
}

export function ListingCard({
  listing,
  isSaved = false,
  redirectTo = "/",
}: {
  listing: ListingWithOwner;
  isSaved?: boolean;
  redirectTo?: string;
}) {
  const price = priceLabel(listing);
  const featured = isFeaturedNow(listing);
  const multiple = profitMultiple(
    listing.price_cents,
    listing.metrics.annual_profit_cents,
  );

  return (
    <article className="card card-hover group relative flex flex-col overflow-hidden">
      <Link href={`/listing/${listing.id}`} className="block">
        <div className="relative">
          <Cover
            seed={listing.id}
            label={listing.title}
            className="h-36 w-full"
          />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {featured ? <span className="badge badge-featured">Featured</span> : null}
            {listing.is_verified ? (
              <span className="badge badge-verified">✓ Verified</span>
            ) : null}
            {listing.status === "sold" ? (
              <span className="badge badge-neutral">Sold</span>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="absolute right-3 top-3">
        <FavoriteButton
          listingId={listing.id}
          isSaved={isSaved}
          redirectTo={redirectTo}
        />
      </div>

      <div className="flex flex-1 flex-col p-5">
        <p className="eyebrow mb-2">
          {MARKETPLACE_BY_KIND[listing.kind]?.icon}{" "}
          {categoryName(listing.kind, listing.category_slug)}
        </p>

        <h3 className="text-[1.0625rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link
            href={`/listing/${listing.id}`}
            className="after:absolute after:inset-0 after:content-[''] hover:text-[var(--color-brand)]"
          >
            {listing.title}
          </Link>
        </h3>

        <p className="mt-2 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          {listing.summary}
        </p>

        {listing.metrics.annual_revenue_cents ||
        listing.metrics.annual_profit_cents ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-[var(--color-surface-2)] p-3">
            <div>
              <dt className="text-[0.6875rem] text-[var(--color-ink-3)]">
                Revenue / yr
              </dt>
              <dd className="text-sm font-semibold">
                {listing.metrics.annual_revenue_cents
                  ? formatMoneyCompact(
                      listing.metrics.annual_revenue_cents,
                      listing.currency,
                    )
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-[0.6875rem] text-[var(--color-ink-3)]">
                Profit / yr
              </dt>
              <dd className="text-sm font-semibold">
                {listing.metrics.annual_profit_cents
                  ? formatMoneyCompact(
                      listing.metrics.annual_profit_cents,
                      listing.currency,
                    )
                  : "—"}
              </dd>
            </div>
          </dl>
        ) : null}

        <div className="mt-auto flex items-end justify-between gap-3 pt-5">
          <div>
            <p className="display text-lg">{price.main}</p>
            {price.sub ? (
              <p className="text-[0.6875rem] text-[var(--color-ink-3)]">
                {price.sub}
              </p>
            ) : multiple ? (
              <p className="text-[0.6875rem] text-[var(--color-ink-3)]">
                {multiple}× annual profit
              </p>
            ) : null}
          </div>
          <div className="text-right">
            <p className="text-[0.75rem] font-medium text-[var(--color-ink-2)]">
              {listing.country}
            </p>
            <p className="text-[0.6875rem] text-[var(--color-ink-3)]">
              {timeAgo(listing.published_at ?? listing.created_at)}
            </p>
          </div>
        </div>
      </div>
    </article>
  );
}

export function ListingGrid({
  listings,
  savedIds = [],
  redirectTo = "/",
  columns = 3,
}: {
  listings: ListingWithOwner[];
  savedIds?: string[];
  redirectTo?: string;
  columns?: 2 | 3 | 4;
}) {
  const cols = {
    2: "sm:grid-cols-2",
    3: "sm:grid-cols-2 lg:grid-cols-3",
    4: "sm:grid-cols-2 lg:grid-cols-4",
  }[columns];

  const saved = new Set(savedIds);

  return (
    <div className={`grid grid-cols-1 gap-5 ${cols}`}>
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          isSaved={saved.has(listing.id)}
          redirectTo={redirectTo}
        />
      ))}
    </div>
  );
}
