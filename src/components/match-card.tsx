import Link from "next/link";
import { Cover } from "./ui";
import { matchLabel, type MatchResult } from "@/lib/match/engine";
import { formatMoney } from "@/lib/money";
import { MARKETPLACE_BY_KIND } from "@/lib/taxonomy";

/**
 * A ranked result, with the reasoning attached.
 *
 * The score never appears without its explanation — a percentage nobody can
 * account for invites more trust than it has earned.
 */
export function MatchCard({ match }: { match: MatchResult }) {
  const { listing, score, reasons, cautions } = match;
  const marketplace = MARKETPLACE_BY_KIND[listing.kind];

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row lg:p-6">
        <Cover
          seed={listing.id}
          label={listing.title}
          className="h-28 w-full shrink-0 sm:h-24 sm:w-32"
        />

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow mb-1.5">
                <span aria-hidden>{marketplace?.icon}</span>{" "}
                {marketplace?.name ?? listing.kind}
              </p>
              <h3 className="text-[1.0625rem] font-semibold leading-snug">
                <Link
                  href={`/listing/${listing.id}`}
                  className="hover:text-[var(--color-brand)]"
                >
                  {listing.title}
                </Link>
              </h3>
            </div>

            <div className="shrink-0 text-right">
              <p className="display text-2xl leading-none text-[var(--color-brand)]">
                {score}%
              </p>
              <p className="mt-1 text-[0.6875rem] font-medium uppercase tracking-wider text-[var(--color-ink-3)]">
                {matchLabel(score)}
              </p>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-3)]">
            {listing.summary}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8125rem]">
            <span className="font-semibold">
              {listing.price_cents
                ? formatMoney(listing.price_cents, listing.currency)
                : "Open to offers"}
            </span>
            <span className="text-[var(--color-ink-3)]">{listing.country}</span>
            {listing.is_verified ? (
              <span className="badge badge-verified">✓ Verified</span>
            ) : null}
          </div>

          {reasons.length ? (
            <ul className="mt-4 space-y-1.5">
              {reasons.slice(0, 3).map((reason) => (
                <li
                  key={reason}
                  className="flex gap-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]"
                >
                  <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                  {reason}
                </li>
              ))}
            </ul>
          ) : null}

          {cautions.length ? (
            <ul className="mt-2 space-y-1.5">
              {cautions.slice(0, 2).map((caution) => (
                <li
                  key={caution}
                  className="flex gap-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]"
                >
                  <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-gold)]" />
                  {caution}
                </li>
              ))}
            </ul>
          ) : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`/listing/${listing.id}`} className="btn btn-outline btn-sm">
              Open listing
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
