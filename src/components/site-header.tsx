import Link from "next/link";
import { MARKETPLACES } from "@/lib/taxonomy";
import {
  getCurrentUser,
  getNotifications,
  getUnreadMessageCount,
} from "@/lib/data";
import { isDemoMode } from "@/lib/supabase/config";
import { GlobalSearch } from "./global-search";

const PRIMARY = [
  { href: "/businesses", label: "Buy a Business" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/patents", label: "Patents & Tech" },
  { href: "/services", label: "Experts" },
  { href: "/partners", label: "Partners" },
];

export async function SiteHeader() {
  const me = await getCurrentUser();
  const [notifications, unread] = me
    ? await Promise.all([getNotifications(me.id), getUnreadMessageCount(me.id)])
    : [[], 0];
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      {isDemoMode ? (
        <div className="bg-[var(--color-ink)] px-4 py-2 text-center text-[0.75rem] text-white/85">
          <span className="font-semibold text-white">Demo mode</span> — sample
          data, signed in as {me?.full_name ?? "a guest"}. Add Supabase
          credentials to switch to a live database.
        </div>
      ) : null}

      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]/92 backdrop-blur-md">
        <div className="shell-wide flex h-16 items-center gap-4">
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-ink)] text-sm font-bold text-white"
              aria-hidden
            >
              B
            </span>
            <span className="display text-lg">BizHub</span>
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
            {PRIMARY.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="whitespace-nowrap rounded-lg px-3 py-2 text-[0.875rem] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface-2)] hover:text-[var(--color-ink)]"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Persistent search appears only where the full header fits it
              without squeezing; every page also has its own search. */}
          <div className="ml-auto hidden w-56 shrink-0 2xl:block">
            <GlobalSearch compact />
          </div>

          <div className="ml-auto flex shrink-0 items-center gap-2">

            {me ? (
              <>
                <Link
                  href="/messages"
                  className="relative hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[0.875rem] font-medium text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] sm:flex"
                >
                  Messages
                  {unread > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[0.625rem] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                </Link>
                <Link
                  href="/dashboard/notifications"
                  className="relative hidden rounded-lg px-2.5 py-2 text-[var(--color-ink-2)] hover:bg-[var(--color-surface-2)] sm:block"
                  aria-label={`Notifications${unreadNotifications ? `, ${unreadNotifications} unread` : ""}`}
                >
                  <span aria-hidden>◔</span>
                  {unreadNotifications > 0 ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                  ) : null}
                </Link>
                <Link href="/dashboard" className="btn btn-ghost btn-sm hidden md:inline-flex">
                  Dashboard
                </Link>
              </>
            ) : (
              <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                Sign in
              </Link>
            )}

            <Link href="/sell" className="btn btn-primary btn-sm shrink-0">
              <span className="hidden sm:inline">Sell a business</span>
              <span className="sm:hidden">Sell</span>
            </Link>

            {/* No-JS mobile menu: a native disclosure, no client bundle. */}
            <details className="group relative lg:hidden">
              <summary className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-[var(--color-line-2)] [&::-webkit-details-marker]:hidden">
                <span aria-hidden>☰</span>
                <span className="sr-only">Open menu</span>
              </summary>
              <div className="card absolute right-0 top-11 w-64 p-2 shadow-xl">
                {PRIMARY.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                  >
                    {item.label}
                  </Link>
                ))}
                <div className="my-2 hairline" />
                <Link
                  href="/start-a-business"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                >
                  Start a Business
                </Link>
                <Link
                  href="/digital-assets"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                >
                  Digital Assets
                </Link>
                <Link
                  href="/business-profiles"
                  className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                >
                  Business Profiles
                </Link>
                <div className="my-2 hairline" />
                {me ? (
                  <>
                    <Link
                      href="/dashboard"
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                    >
                      Buyer dashboard
                    </Link>
                    <Link
                      href="/seller"
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                    >
                      Seller dashboard
                    </Link>
                    <Link
                      href="/messages"
                      className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                    >
                      Messages {unread > 0 ? `(${unread})` : ""}
                    </Link>
                    {me.role === "admin" ? (
                      <Link
                        href="/admin"
                        className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                      >
                        Admin
                      </Link>
                    ) : null}
                  </>
                ) : (
                  <Link
                    href="/login"
                    className="block rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-[var(--color-surface-2)]"
                  >
                    Sign in
                  </Link>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}

export function MarketplaceStrip() {
  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="shell table-wrap">
        <div className="flex min-w-max gap-1 py-2">
          {MARKETPLACES.map((m) => (
            <Link
              key={m.slug}
              href={`/${m.slug}`}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-[var(--color-ink-2)] transition-colors hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)]"
            >
              <span aria-hidden>{m.icon}</span> {m.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
