import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Cover, KeyValue, Notice, SectionHead, Stat } from "@/components/ui";
import { ListingGrid, priceLabel } from "@/components/listing-card";
import { FavoriteButton } from "@/components/favorite-button";
import { WatchButton } from "@/components/watch-button";
import { Stars } from "@/components/reputation";
import {
  BuyNowButton,
  ContactButton,
  OfferButton,
  ReportButton,
} from "@/components/listing-actions";
import {
  getCurrentUser,
  getFavoriteIds,
  getListing,
  getMemberReputation,
  getOffers,
  getSettings,
  getSimilarListings,
  getWatchedIds,
} from "@/lib/data";
import {
  formatDate,
  formatMoney,
  formatNumber,
  profitMultiple,
  timeAgo,
} from "@/lib/money";
import { categoryName, MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import { isFeaturedNow } from "@/lib/filters";
import type { DealType, ListingWithOwner } from "@/lib/types";

const DEAL_LABELS: Record<DealType, string> = {
  purchase: "Buy rights outright",
  license_exclusive: "Exclusive licence",
  license_non_exclusive: "Non-exclusive licence",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const listing = await getListing((await params).id);
  if (!listing) return { title: "Listing not found" };
  return { title: listing.title, description: listing.summary };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const listing = await getListing(id);
  if (!listing) notFound();

  const me = await getCurrentUser();
  const [savedIds, similar, settings, offers, watchedIds, reputation] =
    await Promise.all([
      me ? getFavoriteIds(me.id) : Promise.resolve([]),
      getSimilarListings(listing, 3),
      getSettings(),
      getOffers(),
      me ? getWatchedIds(me.id) : Promise.resolve([]),
      getMemberReputation(listing.owner_id),
    ]);

  const isOwner = me?.id === listing.owner_id;
  const isAdmin = me?.role === "admin";
  const visible =
    listing.status === "active" || listing.status === "sold" || isOwner || isAdmin;
  if (!visible) notFound();

  const price = priceLabel(listing);
  const marketplace = MARKETPLACE_BY_KIND[listing.kind];
  const multiple = profitMultiple(
    listing.price_cents,
    listing.metrics.annual_profit_cents,
  );

  // Documents marked `after_offer` unlock once an offer between the two
  // parties has been accepted — the seller controls when diligence opens.
  const hasAcceptedOffer = offers.some(
    (o) =>
      o.listing_id === listing.id &&
      o.status === "accepted" &&
      (o.buyer_id === me?.id || o.seller_id === me?.id),
  );

  const canTransact =
    listing.status === "active" && !isOwner && listing.deal_types.length > 0;

  return (
    <div className="bg-[var(--color-canvas)]">
      {/* ------------------------------------------------------- breadcrumb */}
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell table-wrap py-3">
          <nav
            aria-label="Breadcrumb"
            className="flex min-w-max items-center gap-2 text-[0.75rem] text-[var(--color-ink-3)]"
          >
            <Link href="/marketplace" className="hover:text-[var(--color-ink)]">
              Marketplace
            </Link>
            <span aria-hidden>/</span>
            <Link
              href={`/${marketplace?.slug ?? "marketplace"}`}
              className="hover:text-[var(--color-ink)]"
            >
              {marketplace?.name ?? listing.kind}
            </Link>
            <span aria-hidden>/</span>
            <span className="text-[var(--color-ink-2)]">
              {categoryName(listing.kind, listing.category_slug)}
            </span>
          </nav>
        </div>
      </div>

      {(isOwner || isAdmin) && listing.status !== "active" ? (
        <div className="shell pt-6">
          <Notice
            tone={listing.status === "rejected" ? "danger" : "gold"}
            title={
              listing.status === "pending"
                ? "Awaiting moderation"
                : listing.status === "rejected"
                  ? "Not approved"
                  : `Status: ${listing.status}`
            }
          >
            {listing.status === "pending"
              ? "Only you and the moderation team can see this listing. It goes live once a moderator approves it."
              : (listing.rejection_reason ??
                "This listing is not publicly visible.")}
          </Notice>
        </div>
      ) : null}

      <div className="shell py-8 lg:py-12">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
          {/* ------------------------------------------------------ main */}
          <div className="min-w-0">
            <div className="card overflow-hidden">
              <div className="relative">
                <Cover
                  seed={listing.id}
                  label={listing.title}
                  size="lg"
                  className="h-56 w-full sm:h-72"
                />
                <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                  {isFeaturedNow(listing) ? (
                    <span className="badge badge-featured">Featured</span>
                  ) : null}
                  {listing.is_verified ? (
                    <span className="badge badge-verified">✓ Verified</span>
                  ) : null}
                  {listing.status === "sold" ? (
                    <span className="badge badge-neutral">Sold</span>
                  ) : null}
                </div>
              </div>

              <div className="p-6 lg:p-8">
                <p className="eyebrow mb-3">
                  {marketplace?.icon}{" "}
                  {categoryName(listing.kind, listing.category_slug)} ·{" "}
                  {listing.country}
                </p>
                <h1 className="display text-3xl lg:text-[2.5rem]">
                  {listing.title}
                </h1>
                <p className="mt-4 text-base leading-relaxed text-[var(--color-ink-2)]">
                  {listing.summary}
                </p>

                <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[0.8125rem] text-[var(--color-ink-3)]">
                  <span>{formatNumber(listing.views_count)} views</span>
                  <span>{formatNumber(listing.saves_count)} saves</span>
                  <span>
                    Listed {timeAgo(listing.published_at ?? listing.created_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* ------------------------------------------------ financials */}
            {listing.metrics.annual_revenue_cents ||
            listing.metrics.annual_profit_cents ? (
              <div className="mt-6">
                <h2 className="display mb-4 text-xl">Financials</h2>
                <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
                  <Stat
                    label="Revenue / year"
                    value={
                      listing.metrics.annual_revenue_cents
                        ? formatMoney(
                            listing.metrics.annual_revenue_cents,
                            listing.currency,
                          )
                        : "—"
                    }
                  />
                  <Stat
                    label="Profit / year"
                    value={
                      listing.metrics.annual_profit_cents
                        ? formatMoney(
                            listing.metrics.annual_profit_cents,
                            listing.currency,
                          )
                        : "—"
                    }
                    tone="accent"
                  />
                  <Stat
                    label="Expenses / year"
                    value={
                      listing.metrics.annual_expenses_cents
                        ? formatMoney(
                            listing.metrics.annual_expenses_cents,
                            listing.currency,
                          )
                        : "—"
                    }
                  />
                  <Stat
                    label="Profit multiple"
                    value={multiple ? `${multiple}×` : "—"}
                    hint={multiple ? "Asking price ÷ annual profit" : undefined}
                  />
                </div>

                <dl className="card mt-3.5 px-5 py-1">
                  <KeyValue
                    label="Monthly revenue"
                    value={
                      listing.metrics.monthly_revenue_cents
                        ? formatMoney(
                            listing.metrics.monthly_revenue_cents,
                            listing.currency,
                          )
                        : null
                    }
                  />
                  <KeyValue
                    label="Monthly profit"
                    value={
                      listing.metrics.monthly_profit_cents
                        ? formatMoney(
                            listing.metrics.monthly_profit_cents,
                            listing.currency,
                          )
                        : null
                    }
                  />
                  <KeyValue
                    label="Customers"
                    value={
                      listing.metrics.customers
                        ? formatNumber(listing.metrics.customers)
                        : null
                    }
                  />
                  <KeyValue
                    label="Team size"
                    value={listing.metrics.team_size ?? null}
                  />
                </dl>

                <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                  Figures are provided by the seller and have not been audited
                  by Buildora. Ask for source documents before relying on them.
                </p>
              </div>
            ) : null}

            {/* ------------------------------------------------ description */}
            <div className="card mt-6 p-6 lg:p-8">
              <h2 className="display mb-4 text-xl">About this listing</h2>
              <div className="prose-body max-w-none">
                {listing.description.split("\n\n").map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>

            <ListingDetails listing={listing} />

            {/* --------------------------------------------------- documents */}
            {listing.documents.length ? (
              <div className="card mt-6 p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Documents</h2>
                <ul className="space-y-2.5">
                  {listing.documents.map((doc) => {
                    const unlocked =
                      doc.visibility === "public" ||
                      isOwner ||
                      isAdmin ||
                      (doc.visibility === "after_offer" && hasAcceptedOffer);
                    return (
                      <li
                        key={doc.path}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--color-line)] px-4 py-3"
                      >
                        <span className="text-[0.875rem] font-medium">
                          {doc.name}
                        </span>
                        {unlocked ? (
                          <span className="badge badge-verified">
                            Available
                          </span>
                        ) : (
                          <span className="badge badge-neutral">
                            {doc.visibility === "after_offer"
                              ? "Unlocks after an accepted offer"
                              : "On request"}
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                  Documents are stored privately. Access is granted by the
                  seller and delivered through short-lived links — never a
                  public URL.
                </p>
              </div>
            ) : null}

            {/* ------------------------------------------------------ report */}
            <div className="mt-6 flex justify-end">
              <ReportButton targetType="listing" targetId={listing.id} />
            </div>
          </div>

          {/* --------------------------------------------------- sidebar */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <p className="eyebrow mb-2">
                {listing.deal_types.includes("purchase")
                  ? "Asking price"
                  : "Licence fee"}
              </p>
              <p className="display text-4xl">{price.main}</p>
              {price.sub ? (
                <p className="mt-1 text-[0.8125rem] text-[var(--color-ink-3)]">
                  {price.sub}
                </p>
              ) : null}

              <div className="mt-4 flex flex-wrap gap-1.5">
                {listing.deal_types.map((d) => (
                  <span key={d} className="badge badge-brand">
                    {DEAL_LABELS[d]}
                  </span>
                ))}
              </div>

              {listing.price_cents > 0 ? (
                <dl className="mt-5 rounded-lg bg-[var(--color-surface-2)] p-4 text-[0.8125rem]">
                  <div className="flex justify-between">
                    <dt className="text-[var(--color-ink-3)]">
                      Platform fee ({settings.commission_bps / 100}%)
                    </dt>
                    <dd>
                      {formatMoney(
                        Math.round(
                          (listing.price_cents * settings.commission_bps) /
                            10_000,
                        ),
                        listing.currency,
                      )}
                    </dd>
                  </div>
                  <div className="mt-2 flex justify-between border-t border-[var(--color-line)] pt-2">
                    <dt className="text-[var(--color-ink-3)]">
                      Seller receives
                    </dt>
                    <dd className="font-semibold">
                      {formatMoney(
                        listing.price_cents -
                          Math.round(
                            (listing.price_cents * settings.commission_bps) /
                              10_000,
                          ),
                        listing.currency,
                      )}
                    </dd>
                  </div>
                </dl>
              ) : null}

              <div className="mt-5 space-y-2.5">
                {isOwner ? (
                  <>
                    <Link href="/seller/listings" className="btn btn-primary w-full">
                      Manage this listing
                    </Link>
                    <Link href="/seller/offers" className="btn btn-outline w-full">
                      View offers
                    </Link>
                  </>
                ) : listing.status === "sold" ? (
                  <p className="rounded-lg bg-[var(--color-surface-2)] px-4 py-3 text-center text-[0.8125rem] text-[var(--color-ink-3)]">
                    This listing has been sold.
                  </p>
                ) : !me ? (
                  <Link href="/login" className="btn btn-brand w-full">
                    Sign in to make an offer
                  </Link>
                ) : (
                  <>
                    {listing.deal_types.includes("purchase") &&
                    listing.price_cents > 0 ? (
                      <BuyNowButton
                        listingId={listing.id}
                        listingTitle={listing.title}
                        currency={listing.currency}
                        priceCents={listing.price_cents}
                        commissionBps={settings.commission_bps}
                        disabled={!canTransact}
                      />
                    ) : null}
                    <OfferButton
                      listingId={listing.id}
                      listingTitle={listing.title}
                      currency={listing.currency}
                      dealTypes={listing.deal_types}
                      askingPrice={listing.price_cents}
                      licensePrice={listing.attributes.license_price_cents}
                      licensePeriod={listing.attributes.license_period}
                      disabled={!canTransact}
                    />
                    <ContactButton
                      listingId={listing.id}
                      listingTitle={listing.title}
                      sellerName={listing.owner.full_name}
                    />
                    <FavoriteButton
                      listingId={listing.id}
                      isSaved={savedIds.includes(listing.id)}
                      redirectTo={`/listing/${listing.id}`}
                      variant="full"
                    />
                    {me ? (
                      <WatchButton
                        listingId={listing.id}
                        watching={watchedIds.includes(listing.id)}
                      />
                    ) : null}
                  </>
                )}
              </div>
            </div>

            {/* ------------------------------------------------ seller card */}
            <div className="card mt-5 p-6">
              <p className="eyebrow mb-4">Seller</p>
              <div className="flex items-start gap-3.5">
                <Cover
                  seed={listing.owner.id}
                  label={listing.owner.full_name}
                  size="sm"
                  className="h-11 w-11 shrink-0 rounded-full"
                />
                <div className="min-w-0">
                  <p className="flex items-center gap-2 font-semibold">
                    <Link
                      href={`/members/${listing.owner.id}`}
                      className="hover:text-[var(--color-brand)]"
                    >
                      {listing.owner.full_name}
                    </Link>
                    {listing.owner.is_verified ? (
                      <span
                        className="badge badge-verified"
                        title="Identity and details confirmed by Buildora"
                      >
                        ✓
                      </span>
                    ) : null}
                  </p>
                  {listing.owner.headline ? (
                    <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                      {listing.owner.headline}
                    </p>
                  ) : null}
                  <p className="mt-2 text-[0.75rem] text-[var(--color-ink-3)]">
                    {listing.owner.country ? `${listing.owner.country} · ` : ""}
                    Member since {formatDate(listing.owner.created_at)}
                  </p>
                </div>
              </div>

              <Link
                href={`/members/${listing.owner.id}`}
                className="btn btn-outline btn-sm mt-4 w-full"
              >
                View seller profile
              </Link>
              {reputation && reputation.rating.count ? (
                <p className="mt-3 flex items-center justify-center gap-2 text-[0.75rem] text-[var(--color-ink-2)]">
                  <Stars rating={reputation.rating.average} />
                  {reputation.rating.average.toFixed(1)} ·{" "}
                  {reputation.rating.count}{" "}
                  {reputation.rating.count === 1 ? "review" : "reviews"} · Trust{" "}
                  {reputation.trust.score}
                </p>
              ) : null}

              <p className="mt-3 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                Contact details are never published. Message the seller through
                Buildora so the conversation is recorded.
              </p>
            </div>

            <div className="mt-5">
              <Notice tone="neutral">
                Buildora is a venue for buyers and sellers to find each other. It
                does not guarantee that this business is profitable, that this
                technology is valuable, or that this seller is reliable. Do your
                own due diligence and take independent advice.
              </Notice>
            </div>
          </div>
        </div>

        {/* --------------------------------------------------- similar */}
        {similar.length ? (
          <div className="mt-16">
            <SectionHead
              title="Similar listings"
              action={{
                href: `/${marketplace?.slug ?? "marketplace"}`,
                label: `More in ${marketplace?.name ?? "this marketplace"}`,
              }}
            />
            <ListingGrid
              listings={similar}
              savedIds={savedIds}
              redirectTo={`/listing/${listing.id}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** Kind-specific detail blocks — only rendered when the data exists. */
function ListingDetails({ listing }: { listing: ListingWithOwner }) {
  const a = listing.attributes;

  const business = (
    <>
      <KeyValue label="Business model" value={a.business_model ?? null} />
      <KeyValue label="Year founded" value={a.year_founded ?? null} />
      <KeyValue
        label="Operation"
        value={
          a.is_online === undefined
            ? null
            : a.is_online
              ? "Online"
              : "Offline / physical"
        }
      />
      <KeyValue
        label="Website"
        value={
          a.website ? (
            <a
              href={a.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-[var(--color-brand)] hover:underline"
            >
              {a.website.replace(/^https?:\/\//, "")}
            </a>
          ) : null
        }
      />
      {a.socials?.map((s) => (
        <KeyValue
          key={s.url}
          label={s.label}
          value={
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-[var(--color-brand)] hover:underline"
            >
              Profile
            </a>
          }
        />
      ))}
    </>
  );

  const patent = (
    <>
      <KeyValue label="Patent / application number" value={a.patent_number ?? null} />
      <KeyValue label="Jurisdiction" value={a.jurisdiction ?? null} />
      <KeyValue
        label="Legal status"
        value={
          a.patent_status ? (
            <span
              className={`badge ${
                /grant/i.test(a.patent_status)
                  ? "badge-verified"
                  : "badge-neutral"
              }`}
            >
              {a.patent_status}
            </span>
          ) : null
        }
      />
      <KeyValue label="Rights holder" value={a.rights_holder ?? null} />
      <KeyValue label="Filing date" value={a.filing_date ?? null} />
      <KeyValue label="Technology field" value={a.technology_field ?? null} />
      <KeyValue
        label="Licence fee"
        value={
          a.license_price_cents
            ? `${formatMoney(a.license_price_cents, listing.currency)} / ${a.license_period ?? "year"}`
            : null
        }
      />
    </>
  );

  const service = (
    <>
      <KeyValue label="Experience" value={a.experience_years ? `${a.experience_years} years` : null} />
      <KeyValue label="Rate basis" value={a.rate_unit ? `per ${a.rate_unit}` : null} />
    </>
  );

  const partner = (
    <>
      <KeyValue
        label="Capital contribution expected"
        value={
          a.investment_required_cents !== undefined
            ? a.investment_required_cents === 0
              ? "None"
              : formatMoney(a.investment_required_cents, listing.currency)
            : null
        }
      />
      <KeyValue label="Commitment" value={a.commitment ?? null} />
      <KeyValue
        label="Location"
        value={a.remote === undefined ? null : a.remote ? "Remote" : "On-site"}
      />
    </>
  );

  const blocks = {
    business,
    digital_asset: business,
    idea: business,
    patent,
    ai_tool: patent,
    service,
    marketing: service,
    product: service,
    partner,
  }[listing.kind];

  const hasSkills = a.skills?.length || a.tech_stack?.length;
  const hasAssets = a.assets_included?.length;

  return (
    <>
      <div className="card mt-6 px-6 py-2 lg:px-8">
        <dl>{blocks}</dl>
      </div>

      {a.reason_for_selling ? (
        <div className="card mt-6 p-6 lg:p-8">
          <h2 className="display mb-3 text-xl">Reason for selling</h2>
          <p className="leading-relaxed text-[var(--color-ink-2)]">
            {a.reason_for_selling}
          </p>
        </div>
      ) : null}

      {hasAssets ? (
        <div className="card mt-6 p-6 lg:p-8">
          <h2 className="display mb-4 text-xl">What the buyer receives</h2>
          <ul className="space-y-2.5">
            {a.assets_included!.map((item) => (
              <li key={item} className="flex gap-3">
                <span className="text-[var(--color-accent)]" aria-hidden>
                  ✓
                </span>
                <span className="text-[0.9375rem] text-[var(--color-ink-2)]">
                  {item}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {hasSkills ? (
        <div className="card mt-6 p-6 lg:p-8">
          <h2 className="display mb-4 text-xl">
            {a.skills?.length ? "Skills" : "Technology"}
          </h2>
          <div className="flex flex-wrap gap-2">
            {[...(a.skills ?? []), ...(a.tech_stack ?? [])].map((s) => (
              <span key={s} className="badge badge-neutral">
                {s}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {a.portfolio?.length ? (
        <div className="card mt-6 p-6 lg:p-8">
          <h2 className="display mb-4 text-xl">Portfolio</h2>
          <ul className="space-y-2.5">
            {a.portfolio.map((p) => (
              <li key={p.url}>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="text-[0.9375rem] text-[var(--color-brand)] hover:underline"
                >
                  {p.title} ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
