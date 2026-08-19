import Link from "next/link";
import { MARKETPLACES } from "@/lib/taxonomy";
import { isDemoMode } from "@/lib/supabase/config";

const COLUMNS = [
  {
    title: "Marketplaces",
    links: MARKETPLACES.slice(0, 5).map((m) => ({
      href: `/${m.slug}`,
      label: m.name,
    })),
  },
  {
    title: "Build",
    links: [
      { href: "/workspace", label: "My Business" },
      { href: "/start-a-business", label: "Start a Business" },
      { href: "/bizmatch", label: "BizMatch" },
      { href: "/co-founders", label: "Find a Co-Founder" },
      { href: "/tools", label: "Calculators" },
      { href: "/market-research", label: "Market Research" },
    ],
  },
  {
    title: "Discover",
    links: [
      { href: "/opportunities", label: "Opportunities" },
      { href: "/network", label: "Network" },
      { href: "/members", label: "Members" },
      { href: "/business-profiles", label: "Business Profiles" },
      { href: "/partners", label: "Find a Partner" },
      { href: "/pricing", label: "Pricing & Fees" },
    ],
  },
  {
    title: "Sell",
    links: [
      { href: "/sell", label: "List a Business" },
      { href: "/sell?kind=patent", label: "List a Patent" },
      { href: "/seller", label: "Seller Dashboard" },
      { href: "/seller/verification", label: "Get Verified" },
      { href: "/seller/promotions", label: "Featured & Boost" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms of Service" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/marketplace-rules", label: "Marketplace Rules" },
      { href: "/legal/verification", label: "About Verification" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-[var(--color-line)] bg-[var(--color-surface)]">
      <div className="shell py-14">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-7">
          <div className="lg:col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-ink)] text-sm font-bold text-white"
                aria-hidden
              >
                B
              </span>
              <span className="display text-lg">Buildora</span>
            </Link>
            <p className="mt-4 max-w-xs text-[0.875rem] leading-relaxed text-[var(--color-ink-3)]">
              Buy a business. Build a business. Sell a business. Everything you
              need to start, buy, build and grow — in one marketplace.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h3 className="eyebrow mb-3.5">{col.title}</h3>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link
                      href={link.href}
                      className="text-[0.875rem] text-[var(--color-ink-2)] transition-colors hover:text-[var(--color-ink)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 hairline pt-6">
          <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
            Buildora is a marketplace that connects buyers and sellers. It does
            not guarantee that any business is profitable, that any patent or
            technology is valuable, that any transaction will be successful, or
            that any seller is reliable. Verification confirms information a
            seller has provided, to the extent the platform can lawfully check
            it — it is never an endorsement or a recommendation. Do your own
            due diligence and take independent legal, tax and financial advice
            before entering any transaction.
          </p>
          {/* The one operational fact a member deserves before they invest
              effort here. It sits in the small print rather than across the
              top of every page: informative, not a badge saying "unfinished". */}
          {isDemoMode ? (
            <p className="mt-4 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
              Buildora is not yet connected to a permanent database. Listings,
              accounts and messages are held only while the service is running
              and are cleared periodically.
            </p>
          ) : null}
          <p className="mt-4 text-[0.75rem] text-[var(--color-ink-3)]">
            © {new Date().getFullYear()} Buildora. The legal pages are
            placeholders pending review by a qualified professional.
          </p>
        </div>
      </div>
    </footer>
  );
}
