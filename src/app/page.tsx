import Link from "next/link";
import { GlobalSearch } from "@/components/global-search";
import { ListingGrid } from "@/components/listing-card";
import { MarketplaceStrip } from "@/components/site-header";
import { MatchCard } from "@/components/match-card";
import { Notice, Section, SectionHead } from "@/components/ui";
import { recommendFor } from "@/lib/match/recommend";
import {
  getCurrentUser,
  getFavoriteIds,
  getFeaturedListings,
  getListings,
  getMarketplaceCounts,
  getSettings,
  getTransactions,
} from "@/lib/data";
import { formatMoney, formatNumber } from "@/lib/money";
import { MARKETPLACES, REGULATED_SURFACES } from "@/lib/taxonomy";

export default async function HomePage() {
  const me = await getCurrentUser();

  const [
    savedIds,
    counts,
    settings,
    transactions,
    featuredBusinesses,
    trending,
    newest,
    featuredPatents,
    services,
    digitalAssets,
  ] = await Promise.all([
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
    getMarketplaceCounts(),
    getSettings(),
    getTransactions(),
    getFeaturedListings(3, "business"),
    getListings({ sort: "popular", limit: 3 }),
    getListings({ kind: "business", sort: "newest", limit: 3 }),
    getFeaturedListings(3, "patent"),
    getListings({ kind: "service", sort: "popular", limit: 3 }),
    getListings({ kind: "digital_asset", sort: "popular", limit: 3 }),
  ]);

  // Recommendations are built from what this member has actually saved and
  // watched. With no history there is nothing honest to personalise on, so the
  // strip simply does not appear rather than pretending to know them.
  const recommended = await recommendFor(me?.id ?? null, savedIds);

  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0);
  const settled = transactions.filter(
    (t) => t.status === "paid" || t.status === "released",
  );

  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-40"
          aria-hidden
        />
        <div className="shell py-16 lg:py-24">
          <div className="max-w-3xl">
            <p className="eyebrow mb-5">
              The international business marketplace
            </p>
            <h1 className="display text-[2.75rem] leading-[1.02] sm:text-6xl lg:text-[4.5rem]">
              Build. Buy. Sell.{" "}
              <span className="text-[var(--color-brand)]">Grow.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-[var(--color-ink-2)]">
              Everything you need to start, buy, build and grow a business.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/businesses" className="btn btn-primary btn-lg">
                Buy a Business
              </Link>
              <Link href="/business-profiles/new" className="btn btn-brand btn-lg">
                Start a Business
              </Link>
              <Link href="/sell" className="btn btn-outline btn-lg">
                Sell a Business
              </Link>
              <Link href="/marketplace" className="btn btn-outline btn-lg">
                Explore Marketplace
              </Link>
            </div>

            <div className="mt-10 max-w-2xl">
              <GlobalSearch />
            </div>
          </div>

          <dl className="mt-14 grid grid-cols-2 gap-6 border-t border-[var(--color-line)] pt-8 sm:grid-cols-4">
            {[
              { label: "Live listings", value: formatNumber(totalListings) },
              { label: "Marketplaces", value: MARKETPLACES.length },
              {
                label: "Platform commission",
                value: `${settings.commission_bps / 100}%`,
              },
              {
                label: "Transactions recorded",
                value: formatNumber(settled.length),
              },
            ].map((stat) => (
              <div key={stat.label}>
                <dt className="eyebrow">{stat.label}</dt>
                <dd className="display mt-1.5 text-2xl">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <MarketplaceStrip />

      {/* --------------------------------------------------- recommended */}
      {recommended.length ? (
        <Section className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
          <div className="shell">
            <SectionHead
              eyebrow="Recommended for you"
              title="Based on what you have saved"
              description="Drawn from the listings you saved and are watching — the categories, the price range and the countries. Buildora does not rank these by quality, and nobody pays to be here."
              action={{ href: "/bizmatch", label: "Refine with BizMatch" }}
            />
            <div className="space-y-4">
              {recommended.map((match) => (
                <MatchCard key={match.listing.id} match={match} />
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ------------------------------------------------------ categories */}
      <Section className="bg-[var(--color-canvas)]">
        <div className="shell">
          <SectionHead
            eyebrow="Categories"
            title="Nine marketplaces, one platform"
            description="Whether you are acquiring a company, licensing a technology or hiring the specialist who will build your next product — it is all here."
          />

          <div className="grid grid-cols-2 gap-3.5 md:grid-cols-3 lg:grid-cols-4">
            {MARKETPLACES.map((m) => (
              <Link
                key={m.slug}
                href={`/${m.slug}`}
                className="card card-hover flex flex-col p-5"
              >
                <span className="text-2xl" aria-hidden>
                  {m.icon}
                </span>
                <span className="mt-3 text-[0.9375rem] font-semibold leading-snug">
                  {m.name}
                </span>
                <span className="mt-1.5 line-clamp-2 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                  {m.tagline}
                </span>
                <span className="mt-3 text-[0.6875rem] font-semibold text-[var(--color-ink-3)]">
                  {counts[m.kind] ?? 0} live
                </span>
              </Link>
            ))}

            {REGULATED_SURFACES.map((s) => (
              <div
                key={s.slug}
                className="card flex flex-col border-dashed p-5 opacity-80"
              >
                <span className="text-2xl" aria-hidden>
                  {s.icon}
                </span>
                <span className="mt-3 text-[0.9375rem] font-semibold leading-snug">
                  {s.name}
                </span>
                <span className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                  {s.note}
                </span>
                <span className="badge badge-neutral mt-3 self-start">
                  Not yet available
                </span>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------ featured businesses */}
      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="Featured"
            title="Featured businesses"
            description="Paid placement. Featured status is advertising — it says nothing about the quality of a business."
            action={{ href: "/businesses", label: "All businesses" }}
          />
          <ListingGrid
            listings={featuredBusinesses}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* -------------------------------------------------------- trending */}
      <Section className="border-t border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="Momentum"
            title="Trending opportunities"
            description="The most viewed and most saved listings across every marketplace this week."
            action={{ href: "/marketplace?sort=popular", label: "See all" }}
          />
          <ListingGrid listings={trending} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* ----------------------------------------------------------- newest */}
      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="Just listed"
            title="New businesses"
            action={{ href: "/businesses?sort=newest", label: "Browse newest" }}
          />
          <ListingGrid listings={newest} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* --------------------------------------------------------- patents */}
      <Section className="border-t border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="Intellectual property"
            title="Featured patents & technologies"
            description="Buy the rights outright or license the technology. Every listing states its status and jurisdiction — a pending application is never shown as a granted patent."
            action={{ href: "/patents", label: "All patents" }}
          />
          <ListingGrid
            listings={featuredPatents}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* -------------------------------------------------------- services */}
      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="Talent"
            title="Popular services"
            description="Developers, designers, marketers, accountants and lawyers who work with founders."
            action={{ href: "/services", label: "All experts" }}
          />
          <ListingGrid listings={services} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* -------------------------------------------------- digital assets */}
      <Section className="border-t border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="Digital"
            title="SaaS, apps, sites & domains"
            action={{ href: "/digital-assets", label: "All digital assets" }}
          />
          <ListingGrid
            listings={digitalAssets}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* ------------------------------------------------------- how it works */}
      <Section className="border-t border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="How Buildora works"
            title="From “I want to start a business” to a business"
            description="Three paths through the same platform. Most people end up using all three."
          />

          <div className="grid gap-5 lg:grid-cols-3">
            {[
              {
                tag: "Buy",
                title: "Acquire something that already works",
                steps: [
                  "Search and filter by price, profit, country and category",
                  "Save listings and message the seller privately",
                  "Make an offer, counter and negotiate in one thread",
                  "Review the documents the seller releases after acceptance",
                  "Close the deal with your own legal and financial advisers",
                ],
                href: "/businesses",
                cta: "Buy a business",
              },
              {
                tag: "Build",
                title: "Start from an idea",
                steps: [
                  "Set up your business and say what it does",
                  "Work through a starter checklist, or write your own steps",
                  "Publish products and prices on your own storefront",
                  "Find a partner, a developer, a designer or a supplier",
                  "License the technology you would otherwise have to invent",
                ],
                href: "/business-profiles/new",
                cta: "Start a business",
              },
              {
                tag: "Sell",
                title: "Exit on your terms",
                steps: [
                  "Create a listing with your financials and what is included",
                  "A moderator reviews it before it goes live",
                  "Request verification of the details you can evidence",
                  "Receive offers, counter, and pick your buyer",
                  `Pay ${settings.commission_bps / 100}% only when a transaction completes`,
                ],
                href: "/sell",
                cta: "Sell a business",
              },
            ].map((col) => (
              <div key={col.tag} className="card flex flex-col p-6">
                <span className="badge badge-brand self-start">{col.tag}</span>
                <h3 className="mt-4 text-lg font-semibold leading-snug tracking-[-0.015em]">
                  {col.title}
                </h3>
                <ol className="mt-5 flex-1 space-y-3">
                  {col.steps.map((step, i) => (
                    <li key={step} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[0.6875rem] font-bold text-[var(--color-ink-2)]">
                        {i + 1}
                      </span>
                      <span className="text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
                        {step}
                      </span>
                    </li>
                  ))}
                </ol>
                <Link href={col.href} className="btn btn-outline mt-6 w-full">
                  {col.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ------------------------------------------------------- commission */}
      <Section className="border-t border-[var(--color-line)]">
        <div className="shell">
          <div className="card overflow-hidden lg:grid lg:grid-cols-2">
            <div className="p-8 lg:p-12">
              <p className="eyebrow mb-3">Pricing</p>
              <h2 className="display text-3xl">
                {settings.commission_bps / 100}% commission. Nothing else
                required.
              </h2>
              <p className="mt-4 text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
                Listing is free. The platform earns a commission only when a
                transaction completes. Featured placement, boosts and
                subscriptions are optional extras — never a condition of
                selling.
              </p>
              <Link href="/pricing" className="btn btn-primary mt-6">
                See full pricing
              </Link>
            </div>

            <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] p-8 lg:border-l lg:border-t-0 lg:p-12">
              <p className="eyebrow mb-4">Worked example</p>
              <dl className="space-y-3.5">
                <div className="flex items-baseline justify-between">
                  <dt className="text-[0.875rem] text-[var(--color-ink-2)]">
                    Business price
                  </dt>
                  <dd className="display text-xl">{formatMoney(5_000_000)}</dd>
                </div>
                <div className="flex items-baseline justify-between">
                  <dt className="text-[0.875rem] text-[var(--color-ink-2)]">
                    Platform fee ({settings.commission_bps / 100}%)
                  </dt>
                  <dd className="text-lg font-semibold text-[var(--color-danger)]">
                    −{formatMoney(500_000)}
                  </dd>
                </div>
                <div className="hairline pt-3.5">
                  <div className="flex items-baseline justify-between">
                    <dt className="text-[0.875rem] font-medium">
                      Seller receives
                    </dt>
                    <dd className="display text-2xl text-[var(--color-accent)]">
                      {formatMoney(4_500_000)}
                    </dd>
                  </div>
                </div>
              </dl>
              <div className="mt-6">
                <Notice tone="neutral">
                  The MVP records transactions and shows the split before you
                  commit, but moves no money. Payments and escrow arrive once a
                  regulated marketplace payment provider is integrated.
                </Notice>
              </div>
            </div>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------------------- cta */}
      <section className="border-t border-[var(--color-line)] bg-[var(--color-ink)] text-white">
        <div className="shell py-16 text-center lg:py-20">
          <h2 className="display mx-auto max-w-2xl text-3xl lg:text-4xl">
            Start with “I want to start a business.” Finish with a business.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[0.9375rem] leading-relaxed text-white/70">
            Idea → storefront → partner → specialist → technology → patent →
            website → SaaS → marketing → business.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/business-profiles/new"
              className="btn btn-lg bg-white text-[var(--color-ink)] hover:bg-white/90"
            >
              Start a Business
            </Link>
            <Link
              href="/marketplace"
              className="btn btn-lg border-white/25 bg-transparent text-white hover:bg-white/10"
            >
              Explore the marketplace
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
