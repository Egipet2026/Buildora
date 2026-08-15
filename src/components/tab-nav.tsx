"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function TabNav({
  items,
}: {
  items: { href: string; label: string; count?: number }[];
}) {
  const pathname = usePathname();

  return (
    <nav className="table-wrap -mx-1 border-b border-[var(--color-line)]">
      <div className="flex min-w-max gap-1 px-1">
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`relative whitespace-nowrap px-3.5 py-3 text-[0.875rem] font-medium transition-colors ${
                active
                  ? "text-[var(--color-ink)]"
                  : "text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
              }`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 ? (
                <span className="ml-1.5 rounded-full bg-[var(--color-surface-2)] px-1.5 py-0.5 text-[0.6875rem] font-semibold text-[var(--color-ink-2)]">
                  {item.count}
                </span>
              ) : null}
              {active ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[var(--color-ink)]" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
