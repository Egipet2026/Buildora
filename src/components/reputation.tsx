import Link from "next/link";
import { Cover } from "./ui";
import {
  trustBandLabel,
  type RatingSummary,
  type TrustScore,
} from "@/lib/reputation";
import { formatDate } from "@/lib/money";
import type { Profile, Review } from "@/lib/types";

/** Five stars, filled to the nearest half. Text carries the real value. */
export function Stars({
  rating,
  size = "sm",
}: {
  rating: number;
  size?: "sm" | "lg";
}) {
  const filled = Math.round(rating);
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${
        size === "lg" ? "text-lg" : "text-[0.8125rem]"
      }`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden
          className={
            n <= filled
              ? "text-[var(--color-gold)]"
              : "text-[var(--color-line-2)]"
          }
        >
          ★
        </span>
      ))}
    </span>
  );
}

export function RatingSummaryCard({ summary }: { summary: RatingSummary }) {
  if (!summary.count) {
    return (
      <div className="card p-5">
        <p className="eyebrow mb-2">Rating</p>
        <p className="text-[0.875rem] leading-relaxed text-[var(--color-ink-3)]">
          No reviews yet. A review can only be left by someone who completed a
          deal with this member, so an empty section means no completed deals —
          not a bad record.
        </p>
      </div>
    );
  }

  const max = Math.max(...summary.distribution);

  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">Rating</p>
      <div className="flex items-center gap-3">
        <p className="display text-3xl leading-none">
          {summary.average.toFixed(1)}
        </p>
        <div>
          <Stars rating={summary.average} />
          <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-3)]">
            {summary.count} {summary.count === 1 ? "review" : "reviews"}
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-1.5">
        {summary.distribution.map((count, i) => {
          const stars = 5 - i;
          return (
            <div key={stars} className="flex items-center gap-2.5">
              <span className="w-3 text-[0.75rem] text-[var(--color-ink-3)]">
                {stars}
              </span>
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className="h-full rounded-full bg-[var(--color-gold)]"
                  style={{ width: `${max ? (count / max) * 100 : 0}%` }}
                />
              </div>
              <span className="w-4 text-right text-[0.75rem] text-[var(--color-ink-3)]">
                {count}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const BAND_CLASS: Record<TrustScore["band"], string> = {
  new: "text-[var(--color-ink-3)]",
  building: "text-[var(--color-ink-2)]",
  established: "text-[var(--color-brand)]",
  trusted: "text-[var(--color-accent)]",
};

export function TrustScoreCard({ trust }: { trust: TrustScore }) {
  return (
    <div className="card p-5">
      <p className="eyebrow mb-3">Buildora Trust Score</p>

      <div className="flex items-baseline gap-2.5">
        <p className={`display text-3xl leading-none ${BAND_CLASS[trust.band]}`}>
          {trust.score}
        </p>
        <p className="text-[0.8125rem] font-medium text-[var(--color-ink-2)]">
          {trustBandLabel(trust.band)}
        </p>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-full bg-[var(--color-brand)]"
          style={{ width: `${trust.score}%` }}
        />
      </div>

      <dl className="mt-4 space-y-2.5">
        {trust.factors.map((factor) => (
          <div key={factor.label} className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <dt className="text-[0.8125rem] font-medium">{factor.label}</dt>
              <dd className="mt-0.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                {factor.detail}
              </dd>
            </div>
            <span
              className={`shrink-0 text-[0.8125rem] font-semibold tabular-nums ${
                factor.points > 0
                  ? "text-[var(--color-accent)]"
                  : factor.points < 0
                    ? "text-[var(--color-danger)]"
                    : "text-[var(--color-ink-3)]"
              }`}
            >
              {factor.points > 0 ? `+${factor.points}` : factor.points || "—"}
            </span>
          </div>
        ))}
      </dl>

      <p className="mt-4 hairline pt-3 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        The score summarises what Buildora can observe about this account. It is
        not a credit check, not a background check, and not a prediction that a
        deal will go well. Do your own due diligence regardless of the number.
      </p>
    </div>
  );
}

export function ReviewList({
  reviews,
  authors,
}: {
  reviews: Review[];
  authors: Map<string, Profile>;
}) {
  if (!reviews.length) return null;

  return (
    <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
      {reviews.map((review) => {
        const author = authors.get(review.author_id);
        return (
          <article key={review.id} className="p-5 lg:p-6">
            <div className="flex items-start gap-3.5">
              <Cover
                seed={review.author_id}
                label={author?.full_name ?? "Member"}
                size="sm"
                className="h-9 w-9 shrink-0 rounded-full"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="text-[0.875rem] font-semibold">
                    {author ? (
                      <Link
                        href={`/members/${author.id}`}
                        className="hover:text-[var(--color-brand)]"
                      >
                        {author.full_name}
                      </Link>
                    ) : (
                      "Former member"
                    )}
                  </p>
                  <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                    {formatDate(review.created_at)}
                  </span>
                </div>

                <div className="mt-1 flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="badge">Verified deal</span>
                </div>

                <h3 className="mt-2.5 font-semibold">{review.title}</h3>
                <p className="mt-1 leading-relaxed text-[var(--color-ink-2)]">
                  {review.body}
                </p>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
