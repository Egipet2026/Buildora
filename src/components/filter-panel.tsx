"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { SORT_OPTIONS } from "@/lib/filters";
import { COUNTRIES, MARKETPLACES } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";

interface Props {
  /** When set, the marketplace selector is hidden and the kind is fixed. */
  kind?: ListingKind;
  /** Financial filters only make sense where listings carry financials. */
  showFinancials?: boolean;
  showDealTypes?: boolean;
  resultCount: number;
}

export function FilterPanel({
  kind,
  showFinancials = false,
  showDealTypes = false,
  resultCount,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();

  const get = (key: string) => params.get(key) ?? "";

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    startTransition(() => {
      router.replace(next.toString() ? `${pathname}?${next}` : pathname, {
        scroll: false,
      });
    });
  }

  function toggle(key: string) {
    update(key, get(key) === "1" ? "" : "1");
  }

  const activeKind = (kind ?? (get("kind") as ListingKind)) || undefined;
  const categories = activeKind
    ? (MARKETPLACES.find((m) => m.kind === activeKind)?.categories ?? [])
    : MARKETPLACES.flatMap((m) => m.categories);

  // De-duplicate category slugs when browsing across every marketplace.
  const seen = new Set<string>();
  const categoryOptions = categories.filter((c) => {
    if (seen.has(c.slug)) return false;
    seen.add(c.slug);
    return true;
  });

  const cleared = new URLSearchParams();
  if (params.get("sort")) cleared.set("sort", params.get("sort")!);
  const hasFilters = [...params.keys()].some((k) => k !== "sort");

  return (
    <aside
      className={`card p-5 transition-opacity ${pending ? "opacity-60" : ""}`}
      aria-busy={pending}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[0.9375rem] font-semibold">Filters</h2>
        {hasFilters ? (
          <button
            type="button"
            onClick={() =>
              startTransition(() =>
                router.replace(
                  cleared.toString() ? `${pathname}?${cleared}` : pathname,
                  { scroll: false },
                ),
              )
            }
            className="text-[0.75rem] font-medium text-[var(--color-brand)] hover:underline"
          >
            Clear all
          </button>
        ) : null}
      </div>

      <p className="mb-5 text-[0.75rem] text-[var(--color-ink-3)]">
        {resultCount} {resultCount === 1 ? "listing" : "listings"}
      </p>

      <div className="space-y-4">
        <div>
          <label className="field-label" htmlFor="f-sort">
            Sort by
          </label>
          <select
            id="f-sort"
            className="select"
            value={get("sort") || "newest"}
            onChange={(e) => update("sort", e.target.value)}
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        {!kind ? (
          <div>
            <label className="field-label" htmlFor="f-kind">
              Marketplace
            </label>
            <select
              id="f-kind"
              className="select"
              value={get("kind")}
              onChange={(e) => {
                const next = new URLSearchParams(params.toString());
                if (e.target.value) next.set("kind", e.target.value);
                else next.delete("kind");
                // Category slugs are scoped per marketplace.
                next.delete("category");
                startTransition(() =>
                  router.replace(`${pathname}?${next}`, { scroll: false }),
                );
              }}
            >
              <option value="">All marketplaces</option>
              {MARKETPLACES.map((m) => (
                <option key={m.kind} value={m.kind}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div>
          <label className="field-label" htmlFor="f-category">
            Category
          </label>
          <select
            id="f-category"
            className="select"
            value={get("category")}
            onChange={(e) => update("category", e.target.value)}
          >
            <option value="">All categories</option>
            {categoryOptions.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="field-label" htmlFor="f-country">
            Country
          </label>
          <select
            id="f-country"
            className="select"
            value={get("country")}
            onChange={(e) => update("country", e.target.value)}
          >
            <option value="">Any country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="field-label">Price (€)</legend>
          <div className="flex items-center gap-2">
            <input
              className="input"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Min"
              defaultValue={get("minPrice")}
              onBlur={(e) => update("minPrice", e.target.value)}
              aria-label="Minimum price in euros"
            />
            <span className="text-[var(--color-ink-3)]" aria-hidden>
              –
            </span>
            <input
              className="input"
              type="number"
              min={0}
              inputMode="numeric"
              placeholder="Max"
              defaultValue={get("maxPrice")}
              onBlur={(e) => update("maxPrice", e.target.value)}
              aria-label="Maximum price in euros"
            />
          </div>
        </fieldset>

        {showFinancials ? (
          <>
            <div>
              <label className="field-label" htmlFor="f-revenue">
                Min. annual revenue (€)
              </label>
              <input
                id="f-revenue"
                className="input"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Any"
                defaultValue={get("minRevenue")}
                onBlur={(e) => update("minRevenue", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="f-profit">
                Min. annual profit (€)
              </label>
              <input
                id="f-profit"
                className="input"
                type="number"
                min={0}
                inputMode="numeric"
                placeholder="Any"
                defaultValue={get("minProfit")}
                onBlur={(e) => update("minProfit", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="f-year">
                Founded from
              </label>
              <input
                id="f-year"
                className="input"
                type="number"
                min={1800}
                max={new Date().getFullYear()}
                inputMode="numeric"
                placeholder="Any year"
                defaultValue={get("minYear")}
                onBlur={(e) => update("minYear", e.target.value)}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="f-online">
                Online / offline
              </label>
              <select
                id="f-online"
                className="select"
                value={get("online")}
                onChange={(e) => update("online", e.target.value)}
              >
                <option value="">Both</option>
                <option value="online">Online only</option>
                <option value="offline">Offline / physical</option>
              </select>
            </div>
          </>
        ) : null}

        {showDealTypes ? (
          <div>
            <label className="field-label" htmlFor="f-deal">
              Deal type
            </label>
            <select
              id="f-deal"
              className="select"
              value={get("dealType")}
              onChange={(e) => update("dealType", e.target.value)}
            >
              <option value="">Purchase or licence</option>
              <option value="purchase">Buy rights outright</option>
              <option value="license_exclusive">Exclusive licence</option>
              <option value="license_non_exclusive">Non-exclusive licence</option>
            </select>
          </div>
        ) : null}

        <div className="hairline space-y-2.5 pt-4">
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-brand)]"
              checked={get("verified") === "1"}
              onChange={() => toggle("verified")}
            />
            <span className="text-[0.875rem]">Verified only</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2.5">
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-brand)]"
              checked={get("featured") === "1"}
              onChange={() => toggle("featured")}
            />
            <span className="text-[0.875rem]">Featured only</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
