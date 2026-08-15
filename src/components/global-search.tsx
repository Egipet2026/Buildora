"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const EXAMPLES = [
  "SaaS business under €500,000",
  "green technology patent for licence",
  "developer in Bulgaria",
  "profitable e-commerce over €20,000 profit",
];

/**
 * Global search box. Plain-language input is parsed into structured filters
 * server-side on /search, so "a SaaS business under €20,000" narrows by
 * marketplace, category and price rather than matching those words literally.
 */
export function GlobalSearch({
  compact = false,
  defaultValue = "",
}: {
  compact?: boolean;
  defaultValue?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  function go(query: string) {
    const q = query.trim();
    if (!q) return;
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  if (compact) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        role="search"
      >
        <input
          className="input !py-2 text-[0.8125rem]"
          placeholder="Search the marketplace…"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search BizHub"
        />
      </form>
    );
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          go(value);
        }}
        role="search"
        className="flex flex-col gap-2.5 sm:flex-row"
      >
        <input
          className="input flex-1 !py-3.5 text-base"
          placeholder="Describe what you're looking for — “a SaaS business under €20,000”"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Search BizHub"
        />
        <button type="submit" className="btn btn-brand btn-lg">
          Search
        </button>
      </form>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-[0.75rem] text-[var(--color-ink-3)]">Try:</span>
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => {
              setValue(example);
              go(example);
            }}
            className="rounded-full border border-[var(--color-line-2)] bg-[var(--color-surface)] px-3 py-1 text-[0.75rem] text-[var(--color-ink-2)] transition-colors hover:border-[var(--color-ink-3)]"
          >
            {example}
          </button>
        ))}
      </div>
    </div>
  );
}
