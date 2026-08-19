"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";

/**
 * A navigation link that answers "did my tap do anything?".
 *
 * Three signals, in the order a member meets them:
 *
 *  1. The press itself — `.tap` sinks and darkens the row while the finger
 *     is down. This is CSS, so it happens on the very first frame, before
 *     any JavaScript is involved.
 *  2. The wait — if the next page does not arrive immediately, a small
 *     spinner appears beside the label. On a slow phone connection this is
 *     the difference between "loading" and "broken".
 *  3. The arrival — the link for the page you are on is marked
 *     `aria-current="page"` and tinted, so the menu shows where you ended up.
 */
export function NavLink({
  href,
  children,
  className = "",
  exact = false,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
  /** Match this route only, not its children. Use for section landing pages
      that would otherwise stay highlighted from every page beneath them. */
  exact?: boolean;
}) {
  const pathname = usePathname();
  // Links may carry a query string (`/sell?kind=patent`); only the path
  // decides which one is current.
  const target = href.split(/[?#]/)[0];
  const current =
    pathname === target ||
    (!exact && target !== "/" && pathname.startsWith(`${target}/`));

  return (
    <Link
      href={href}
      className={`tap ${className}`}
      aria-current={current ? "page" : undefined}
    >
      {children}
      <PendingDot />
    </Link>
  );
}

function PendingDot() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <>
      <span className="tap-spinner" aria-hidden />
      <span className="sr-only">Loading</span>
    </>
  );
}
