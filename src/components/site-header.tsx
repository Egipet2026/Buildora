import Link from "next/link";
import { MARKETPLACES } from "@/lib/taxonomy";
import {
  getCurrentUser,
  getNotifications,
  getUnreadMessageCount,
} from "@/lib/data";
import { GlobalSearch } from "./global-search";
import { NavLink } from "./nav-link";
import { SignOutButton } from "./sign-out-button";
import { Wordmark } from "./wordmark";

/**
 * The main navigation.
 *
 * Ordered by what people come here to do — browse, then find, then build. The
 * last two are shown only where there is room; the rest of the platform is one
 * tap away in the menu on every screen.
 */
const PRIMARY = [
  { href: "/marketplace", label: "Marketplace", always: true },
  { href: "/businesses", label: "Businesses", always: true },
  { href: "/patents", label: "Patents & Tech", always: true },
  { href: "/services", label: "Services", always: true },
  { href: "/partners", label: "Partners", always: false },
  { href: "/opportunities", label: "Opportunities", always: false },
  { href: "/start-a-business", label: "Start a Business", always: false },
  { href: "/bizmatch", label: "BizMatch", always: true },
];

/**
 * The menu, as topics rather than a list.
 *
 * A flat menu of twenty rows is a wall: nothing stands out, and finding one
 * thing means reading all of it. Four topics fit on a phone screen at once,
 * so the first decision is between four things rather than twenty, and only
 * the topic you open costs you any scrolling.
 */
type MenuItem = { href: string; label: string };

const MENU_TOPICS: { title: string; hint: string; items: MenuItem[] }[] = [
  {
    title: "Buy",
    hint: "Businesses, patents, assets",
    items: [
      { href: "/marketplace", label: "Marketplace" },
      { href: "/businesses", label: "Businesses for sale" },
      { href: "/patents", label: "Patents & technology" },
      { href: "/services", label: "Services" },
      { href: "/digital-assets", label: "Digital assets" },
      { href: "/opportunities", label: "Opportunities" },
    ],
  },
  {
    title: "Build",
    hint: "Your own business, here",
    items: [
      { href: "/workspace", label: "My business" },
      { href: "/start-a-business", label: "Start a business" },
      { href: "/workspace/products", label: "Products" },
      { href: "/workspace/plan", label: "Business plan" },
      { href: "/workspace/goals", label: "Goals & checklist" },
      { href: "/workspace/metrics", label: "Metrics" },
    ],
  },
  {
    title: "Connect",
    hint: "People to build with",
    items: [
      { href: "/bizmatch", label: "BizMatch" },
      { href: "/co-founders", label: "Find a co-founder" },
      { href: "/partners", label: "Find a partner" },
      { href: "/network", label: "Network" },
      { href: "/members", label: "Members" },
      { href: "/business-profiles", label: "Business profiles" },
    ],
  },
  {
    title: "Tools",
    hint: "Run the numbers first",
    items: [
      { href: "/tools", label: "Calculators" },
      { href: "/market-research", label: "Market research" },
      { href: "/pricing", label: "Pricing & fees" },
    ],
  },
];

export async function SiteHeader() {
  const me = await getCurrentUser();
  const [notifications, unread] = me
    ? await Promise.all([getNotifications(me.id), getUnreadMessageCount(me.id)])
    : [[], 0];
  const unreadNotifications = notifications.filter((n) => !n.is_read).length;

  const accountItems: MenuItem[] = me
    ? [
        { href: "/dashboard", label: "Buyer dashboard" },
        { href: "/seller", label: "Seller dashboard" },
        { href: "/dashboard/watchlist", label: "Watchlist" },
        { href: "/dashboard/alerts", label: "Alerts" },
        { href: "/dashboard/reviews", label: "Reviews" },
        {
          href: "/messages",
          label: `Messages${unread > 0 ? ` (${unread})` : ""}`,
        },
        {
          href: "/dashboard/notifications",
          label: `Notifications${unreadNotifications > 0 ? ` (${unreadNotifications})` : ""}`,
        },
        ...(me.role === "admin"
          ? [{ href: "/admin", label: "Admin" }]
          : []),
      ]
    : [];

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--color-line)] bg-[var(--color-surface)]/92 backdrop-blur-md">
        <div className="shell-wide flex h-16 items-center gap-4">
          <Link
            href="/"
            aria-label="Buildora — home"
            className="tap flex shrink-0 items-center gap-2 rounded-lg px-1 py-1"
          >
            <Wordmark idSuffix="header" markClassName="h-7 sm:h-8" />
          </Link>

          <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
            {PRIMARY.map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[0.875rem] font-medium text-[var(--color-ink-2)] ${
                  item.always ? "" : "hidden xl:inline-flex"
                }`}
              >
                {item.label}
              </NavLink>
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
                <NavLink
                  href="/messages"
                  className="relative hidden items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-[0.875rem] font-medium text-[var(--color-ink-2)] sm:flex"
                >
                  Messages
                  {unread > 0 ? (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[0.625rem] font-bold text-white">
                      {unread}
                    </span>
                  ) : null}
                </NavLink>
                <NavLink
                  href="/dashboard/notifications"
                  className="relative hidden items-center rounded-lg px-2.5 py-2 text-[var(--color-ink-2)] sm:flex"
                >
                  <span aria-hidden>◔</span>
                  <span className="sr-only">
                    Notifications
                    {unreadNotifications ? `, ${unreadNotifications} unread` : ""}
                  </span>
                  {unreadNotifications > 0 ? (
                    <span className="absolute right-0.5 top-0.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
                  ) : null}
                </NavLink>
                <SignOutButton
                  className="btn btn-ghost btn-sm hidden md:inline-flex"
                  label="Sign out"
                />
                {/* Listings are created from your own profile, not from the
                    browse pages — those stay filters and listings only. */}
                <Link href="/dashboard" className="btn btn-primary btn-sm shrink-0">
                  <span className="hidden sm:inline">My profile</span>
                  <span className="sm:hidden">Profile</span>
                </Link>
              </>
            ) : (
              <>
                <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                  Sign in
                </Link>
                <Link href="/register" className="btn btn-primary btn-sm shrink-0">
                  <span className="hidden sm:inline">Create account</span>
                  <span className="sm:hidden">Join</span>
                </Link>
              </>
            )}

            {/* No-JS mobile menu: a native disclosure, no client bundle. The
                topics inside are the same mechanism nested one level down. */}
            <details className="group relative">
              <summary className="btn btn-outline flex h-9 w-9 cursor-pointer list-none items-center justify-center p-0 [&::-webkit-details-marker]:hidden">
                <span aria-hidden>☰</span>
                <span className="sr-only">Open menu</span>
              </summary>
              <div className="card absolute right-0 top-11 max-h-[80vh] w-72 overflow-y-auto p-2 shadow-xl">
                {MENU_TOPICS.map((topic) => (
                  <MenuTopic key={topic.title} {...topic} />
                ))}

                <div className="my-2 hairline" />

                {me ? (
                  <>
                    <MenuTopic
                      title="My account"
                      hint="Dashboards, messages, alerts"
                      items={accountItems}
                      badge={unread + unreadNotifications}
                    />
                    <div className="my-2 hairline" />
                    <SignOutButton />
                  </>
                ) : (
                  <>
                    <NavLink
                      href="/login"
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
                    >
                      Sign in
                    </NavLink>
                    <NavLink
                      href="/register"
                      className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium"
                    >
                      Create account
                    </NavLink>
                  </>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>
    </>
  );
}

/**
 * One collapsible topic in the menu.
 *
 * Shut, it is a single row. Open, it reveals its pages indented under a rule,
 * so the relationship between topic and page is visible rather than implied.
 */
function MenuTopic({
  title,
  hint,
  items,
  badge = 0,
}: {
  title: string;
  hint: string;
  items: MenuItem[];
  /** Count of anything unread inside, so a shut topic still says "look here". */
  badge?: number;
}) {
  return (
    <details>
      <summary className="tap flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2.5 [&::-webkit-details-marker]:hidden">
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-sm font-semibold">
            {title}
            {badge > 0 ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--color-brand)] px-1 text-[0.625rem] font-bold text-white">
                {badge}
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-[0.75rem] leading-snug text-[var(--color-ink-3)]">
            {hint}
          </span>
        </span>
        <span className="menu-chev shrink-0 text-[var(--color-ink-3)]" aria-hidden>
          ▾
        </span>
      </summary>

      <div className="mb-1 ml-4 border-l border-[var(--color-line)] pl-2">
        {items.map((item) => (
          <NavLink
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[0.8125rem] font-medium text-[var(--color-ink-2)]"
          >
            {item.label}
          </NavLink>
        ))}
      </div>
    </details>
  );
}

export function MarketplaceStrip() {
  return (
    <div className="border-b border-[var(--color-line)] bg-[var(--color-surface-2)]">
      <div className="shell table-wrap">
        <div className="flex min-w-max gap-1 py-2">
          {MARKETPLACES.map((m) => (
            <NavLink
              key={m.slug}
              href={`/${m.slug}`}
              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-[0.8125rem] font-medium text-[var(--color-ink-2)]"
            >
              <span aria-hidden>{m.icon}</span> {m.name}
            </NavLink>
          ))}
        </div>
      </div>
    </div>
  );
}
