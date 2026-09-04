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

  const recommended = await recommendFor(me?.id ?? null, savedIds);

  const totalListings = Object.values(counts).reduce((a, b) => a + b, 0);
  const settled = transactions.filter(
    (t) => t.status === "paid" || t.status === "released",
  );

  return (
    <>
      {/* ============================================================ HERO */}
      <section className="relative overflow-hidden border-b border-[var(--color-line)]">
        {/* Background gradient with animated elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-surface)] via-[var(--color-canvas)] to-[var(--color-surface)] opacity-60" />
        
        {/* Decorative gradient line */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-brand)] to-transparent opacity-50"
          aria-hidden
        />
        
        {/* Animated background elements */}
        <div className="pointer-events-none absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[var(--color-brand)] opacity-5 blur-3xl" />
        <div className="pointer-events-none absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-[var(--color-brand)] opacity-5 blur-3xl" />

        <div className="shell relative z-10 py-20 lg:py-32">
          <div className="max-w-4xl">
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2">
              <span className="inline-block h-1 w-12 rounded-full bg-[var(--color-brand)]" />
              <p className="text-sm font-semibold tracking-wider text-[var(--color-brand)] uppercase">
                Global Business Marketplace
              </p>
            </div>

            {/* Main heading with gradient */}
            <h1 className="display text-5xl font-bold leading-[1.1] sm:text-6xl lg:text-7xl">
              Build.{" "}
              <span className="inline-block bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-accent)] bg-clip-text text-transparent">
                Buy.
              </span>{" "}
              Sell. Grow.
            </h1>

            {/* Subheading */}
            <p className="mt-8 max-w-2xl text-xl leading-relaxed text-[var(--color-ink-2)]">
              The international marketplace where entrepreneurs start, buy, build and grow businesses. 
              Buy proven companies. License technologies. Hire specialists. Find partners.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-wrap gap-4">
              <Link 
                href="/businesses" 
                className="btn btn-primary btn-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                Explore Businesses
              </Link>
              <Link 
                href="/business-profiles/new" 
                className="btn btn-brand btn-lg font-semibold shadow-lg hover:shadow-xl transition-shadow"
              >
                Start Your Business
              </Link>
              <Link 
                href="/sell" 
                className="btn btn-outline btn-lg font-semibold hover:bg-[var(--color-surface-2)] transition-colors"
              >
                Sell a Business
              </Link>
            </div>

            {/* Search Bar */}
            <div className="mt-12 max-w-2xl">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-[var(--color-brand)] to-[var(--color-accent)] rounded-xl opacity-20 blur-xl" />
                <div className="relative">
                  <GlobalSearch />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Section */}
          <dl className="mt-20 grid grid-cols-2 gap-6 border-t border-[var(--color-line)] pt-12 sm:grid-cols-4">
            {[
              { label: "Active Listings", value: formatNumber(totalListings), icon: "📊" },
              { label: "Marketplaces", value: MARKETPLACES.length, icon: "🌍" },
              { label: "Commission", value: `${settings.commission_bps / 100}%`, icon: "💰" },
              { label: "Transactions", value: formatNumber(settled.length), icon: "✅" },
            ].map((stat) => (
              <div key={stat.label} className="group">
                <div className="flex items-baseline gap-3 mb-2">
                  <span className="text-2xl" aria-hidden>{stat.icon}</span>
                  <dt className="text-xs font-semibold tracking-wide text-[var(--color-ink-3)] uppercase">
                    {stat.label}
                  </dt>
                </div>
                <dd className="display text-3xl font-bold group-hover:text-[var(--color-brand)] transition-colors">
                  {stat.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <MarketplaceStrip />

      {/* ================================================== RECOMMENDED */}
      {recommended.length ? (
        <Section className="border-t border-b border-[var(--color-line)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-canvas)]">
          <div className="shell">
            <SectionHead
              eyebrow="🎯 Personalized"
              title="Recommended Opportunities"
              description="Curated listings based on your saved preferences and watchlist"
              action={{ href: "/bizmatch", label: "Advanced Matching" }}
            />
            <div className="space-y-4">
              {recommended.map((match) => (
                <MatchCard key={match.listing.id} match={match} />
              ))}
            </div>
          </div>
        </Section>
      ) : null}

      {/* ================================================== MARKETPLACES */}
      <Section className="bg-[var(--color-canvas)]">
        <div className="shell">
          <SectionHead
            eyebrow="📚 Categories"
            title="Nine Specialized Marketplaces"
            description="Whether you're acquiring a company, licensing technology, or hiring specialists — everything is unified in one platform."
          />

          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {MARKETPLACES.map((m, idx) => (
              <Link
                key={m.slug}
                href={`/${m.slug}`}
                className="group card card-hover relative overflow-hidden p-5 transition-all duration-300 hover:shadow-lg"
                style={{
                  animationDelay: `${idx * 50}ms`,
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)] to-transparent opacity-0 group-hover:opacity-5 transition-opacity" />
                
                <div className="relative z-10">
                  <span className="text-4xl transition-transform group-hover:scale-110" aria-hidden>
                    {m.icon}
                  </span>
                  <span className="mt-4 block text-base font-bold leading-snug text-[var(--color-ink)]">
                    {m.name}
                  </span>
                  <span className="mt-2 line-clamp-2 block text-sm leading-relaxed text-[var(--color-ink-3)]">
                    {m.tagline}
                  </span>
                  <span className="mt-4 inline-block rounded-full bg-[var(--color-brand)] px-3 py-1 text-xs font-semibold text-white">
                    {counts[m.kind] ?? 0} live
                  </span>
                </div>
              </Link>
            ))}

            {REGULATED_SURFACES.map((s, idx) => (
              <div
                key={s.slug}
                className="card relative overflow-hidden border-2 border-dashed border-[var(--color-line)] p-5 opacity-75"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)] to-transparent opacity-5" />
                
                <div className="relative z-10">
                  <span className="text-4xl opacity-50" aria-hidden>
                    {s.icon}
                  </span>
                  <span className="mt-4 block text-base font-bold leading-snug text-[var(--color-ink)]">
                    {s.name}
                  </span>
                  <span className="mt-2 text-sm leading-relaxed text-[var(--color-ink-3)]">
                    {s.note}
                  </span>
                  <span className="badge badge-neutral mt-4 inline-block">
                    Coming Soon
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ================================================ FEATURED */}
      <Section className="border-y border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="⭐ Spotlight"
            title="Featured Businesses"
            description="Premium placements from verified sellers"
            action={{ href: "/businesses", label: "Browse All" }}
          />
          <ListingGrid
            listings={featuredBusinesses}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* ================================================ TRENDING */}
      <Section className="border-b border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="🔥 Momentum"
            title="Trending This Week"
            description="Most viewed and saved opportunities across all marketplaces"
            action={{ href: "/marketplace?sort=popular", label: "View More" }}
          />
          <ListingGrid listings={trending} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* ================================================ NEWEST */}
      <Section className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="✨ Fresh"
            title="Just Listed"
            action={{ href: "/businesses?sort=newest", label: "See All" }}
          />
          <ListingGrid listings={newest} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* ================================================ PATENTS */}
      <Section className="border-b border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="🔬 IP"
            title="Patents & Technologies"
            description="Buy rights or license technology. Every listing details its status and jurisdiction."
            action={{ href: "/patents", label: "Explore Patents" }}
          />
          <ListingGrid
            listings={featuredPatents}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* ================================================ SERVICES */}
      <Section className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <SectionHead
            eyebrow="👥 Talent"
            title="Vetted Specialists"
            description="Developers, designers, marketers, and consultants for your venture"
            action={{ href: "/services", label: "Find Experts" }}
          />
          <ListingGrid listings={services} savedIds={savedIds} redirectTo="/" />
        </div>
      </Section>

      {/* ================================================ DIGITAL ASSETS */}
      <Section className="border-b border-[var(--color-line)]">
        <div className="shell">
          <SectionHead
            eyebrow="💻 Digital"
            title="SaaS, Apps & Domains"
            action={{ href: "/digital-assets", label: "Browse Digital Assets" }}
          />
          <ListingGrid
            listings={digitalAssets}
            savedIds={savedIds}
            redirectTo="/"
          />
        </div>
      </Section>

      {/* ================================================ HOW IT WORKS */}
      <Section className="border-b border-[var(--color-line)] bg-gradient-to-b from-[var(--color-surface)] to-[var(--color-canvas)]">
        <div className="shell">
          <SectionHead
            eyebrow="🚀 Getting Started"
            title="From Idea to Successful Business"
            description="Three paths, one unified platform. Most entrepreneurs use all three."
          />

          <div className="grid gap-6 lg:grid-cols-3">
            {[
              {
                tag: "Buy",
                icon: "🛍️",
                title: "Acquire an Established Business",
                steps: [
                  "Search & filter by financials, growth, location",
                  "Private messaging with verified sellers",
                  "Make offers and negotiate terms",
                  "Review documents and due diligence",
                  "Close with your advisors",
                ],
                href: "/businesses",
                cta: "Buy Now",
              },
              {
                tag: "Build",
                icon: "🏗️",
                title: "Start From Your Idea",
                steps: [
                  "Create your business profile",
                  "Follow proven startup checklists",
                  "Launch your storefront with products",
                  "Find partners and specialists",
                  "License technologies & tools",
                ],
                href: "/business-profiles/new",
                cta: "Start Building",
              },
              {
                tag: "Sell",
                icon: "💼",
                title: "Exit on Your Terms",
                steps: [
                  "Create a verified business listing",
                  "Professional moderation review",
                  "Get verified and featured",
                  "Receive & negotiate offers",
                  `${settings.commission_bps / 100}% commission on completion`,
                ],
                href: "/sell",
                cta: "List Your Business",
              },
            ].map((col) => (
              <div key={col.tag} className="group card relative overflow-hidden bg-[var(--color-canvas)] p-7 transition-all duration-300 hover:shadow-lg hover:border-[var(--color-brand)]">
                <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-brand)] to-transparent opacity-0 group-hover:opacity-5 transition-opacity" />
                
                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-3xl">{col.icon}</span>
                    <span className="badge badge-brand font-semibold">{col.tag}</span>
                  </div>
                  
                  <h3 className="text-xl font-bold leading-snug tracking-tight mb-5 text-[var(--color-ink)]">
                    {col.title}
                  </h3>
                  
                  <ol className="space-y-3 mb-7">
                    {col.steps.map((step, i) => (
                      <li key={step} className="flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <span className="text-sm leading-relaxed text-[var(--color-ink-2)]">
                          {step}
                        </span>
                      </li>
                    ))}
                  </ol>
                  
                  <Link href={col.href} className="btn btn-primary w-full font-semibold">
                    {col.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ================================================ PRICING */}
      <Section className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell">
          <div className="card overflow-hidden lg:grid lg:grid-cols-2">
            <div className="relative overflow-hidden bg-gradient-to-br from-[var(--color-brand)] to-[var(--color-accent)] p-10 text-white lg:p-14">
              <div className="absolute -right-20 -top-20 h-40 w-40 rounded-full bg-white opacity-10" />
              <div className="relative z-10">
                <p className="text-sm font-semibold tracking-wider text-white/70 uppercase">Transparent Pricing</p>
                <h2 className="display mt-4 text-4xl font-bold leading-tight lg:text-5xl">
                  {settings.commission_bps / 100}%
                </h2>
                <p className="mt-4 text-base leading-relaxed text-white/90">
                  Platform commission on completed transactions. Listing creation is free. Featured placement and analytics tools are optional add-ons.
                </p>
                <Link href="/pricing" className="btn btn-lg bg-white text-[var(--color-brand)] font-semibold mt-8 hover:bg-white/90">
                  View Full Pricing
                </Link>
              </div>
            </div>

            <div className="bg-[var(--color-canvas)] p-10 lg:p-14">
              <p className="text-sm font-semibold tracking-wider text-[var(--color-brand)] uppercase">Example Calculation</p>
              <dl className="mt-8 space-y-5">
                <div className="flex items-baseline justify-between gap-4 group cursor-help">
                  <dt className="text-base text-[var(--color-ink-2)]">
                    Business Listed at
                  </dt>
                  <dd className="display text-2xl font-bold text-[var(--color-ink)]">
                    {formatMoney(5_000_000)}
                  </dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-base text-[var(--color-ink-2)]">
                    Platform Fee ({settings.commission_bps / 100}%)
                  </dt>
                  <dd className="display text-2xl font-bold text-[var(--color-danger)]">
                    −{formatMoney(500_000)}
                  </dd>
                </div>
                <div className="border-t-2 border-[var(--color-line)] pt-5">
                  <div className="flex items-baseline justify-between gap-4">
                    <dt className="text-base font-semibold text-[var(--color-ink)]">
                      Seller Receives
                    </dt>
                    <dd className="display text-3xl font-bold text-[var(--color-accent)]">
                      {formatMoney(4_500_000)}
                    </dd>
                  </div>
                </div>
              </dl>
              
              <Notice tone="neutral" className="mt-8">
                The platform records transactions and displays splits before confirmation. Real payments integrate with regulated payment providers.
              </Notice>
            </div>
          </div>
        </div>
      </Section>

      {/* ================================================ FINAL CTA */}
      <section className="relative overflow-hidden bg-gradient-to-r from-[var(--color-ink)] via-[var(--color-brand)] to-[var(--color-accent)] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-white opacity-5" />
          <div className="absolute -left-40 -bottom-40 h-80 w-80 rounded-full bg-white opacity-5" />
        </div>

        <div className="shell relative z-10 py-20 text-center lg:py-28">
          <p className="text-sm font-semibold tracking-wider text-white/70 uppercase">Ready to Begin?</p>
          <h2 className="display mx-auto max-w-3xl mt-4 text-4xl font-bold leading-tight lg:text-5xl">
            From "I want to start" to a thriving business
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-white/80">
            Join thousands of entrepreneurs buying, building, and scaling successful businesses on Buildora.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            <Link
              href="/business-profiles/new"
              className="btn btn-lg bg-white text-[var(--color-ink)] font-semibold hover:bg-white/90 shadow-lg"
            >
              Start Your Journey
            </Link>
            <Link
              href="/marketplace"
              className="btn btn-lg border-white/30 bg-transparent text-white font-semibold hover:bg-white/10 transition-colors"
            >
              Explore Opportunities
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
