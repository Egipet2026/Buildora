import Link from "next/link";
import { ListingForm } from "@/components/listing-form";
import { Notice, PageHeader } from "@/components/ui";
import { getCurrentUser, getSettings } from "@/lib/data";
import { formatMoney } from "@/lib/money";
import { MARKETPLACES } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";
import type { SearchParams } from "@/components/browse";

export const metadata = {
  title: "Sell a Business",
  description:
    "List your business, patent, technology, digital asset or service on Bizora. Free to list — commission only on a completed transaction.",
};

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const requested = Array.isArray(sp.kind) ? sp.kind[0] : sp.kind;
  const initialKind = MARKETPLACES.some((m) => m.kind === requested)
    ? (requested as ListingKind)
    : undefined;

  const [me, settings] = await Promise.all([getCurrentUser(), getSettings()]);

  return (
    <>
      <PageHeader
        eyebrow="Sell on Bizora"
        title="Create a listing"
        description="Free to list. You pay a commission only when a transaction completes — nothing up front, nothing if it does not sell."
      >
        <Link href="/seller/listings" className="btn btn-outline">
          My listings
        </Link>
      </PageHeader>

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {me ? (
              <ListingForm initialKind={initialKind} />
            ) : (
              <div className="card p-10 text-center">
                <h2 className="display text-xl">Sign in to create a listing</h2>
                <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
                  You need an account so buyers can message you and so offers
                  reach the right place.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/login" className="btn btn-brand">
                    Sign in
                  </Link>
                  <Link href="/register" className="btn btn-outline">
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="text-[0.9375rem] font-semibold">
                What it costs to sell
              </h2>
              <dl className="mt-4 space-y-3 text-[0.875rem]">
                <div className="flex justify-between">
                  <dt className="text-[var(--color-ink-3)]">Creating a listing</dt>
                  <dd className="font-semibold text-[var(--color-accent)]">
                    Free
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-ink-3)]">
                    Commission on a sale
                  </dt>
                  <dd className="font-semibold">
                    {settings.commission_bps / 100}%
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-ink-3)]">
                    Featured ({settings.featured_days} days)
                  </dt>
                  <dd>{formatMoney(settings.featured_price_cents)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[var(--color-ink-3)]">
                    Boost ({settings.boost_days} days)
                  </dt>
                  <dd>{formatMoney(settings.boost_price_cents)}</dd>
                </div>
              </dl>
              <Link
                href="/pricing"
                className="mt-4 inline-block text-[0.8125rem] font-medium text-[var(--color-brand)] hover:underline"
              >
                Full pricing →
              </Link>
            </div>

            <div className="card p-6">
              <h2 className="text-[0.9375rem] font-semibold">
                What happens next
              </h2>
              <ol className="mt-4 space-y-3.5">
                {[
                  "You submit the listing",
                  "A moderator reviews it — usually within a working day",
                  "It goes live and buyers can save it and message you",
                  "Offers arrive in your seller dashboard; you accept, decline or counter",
                  "You release documents to the buyer once you accept an offer",
                ].map((step, i) => (
                  <li key={step} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[0.6875rem] font-bold">
                      {i + 1}
                    </span>
                    <span className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <Notice tone="gold" title="Be straight with buyers">
              Overstated figures do not survive due diligence — they just cost
              you the deal and your credibility. Listings that misrepresent
              financials, ownership or legal status are removed, and repeat
              offenders are blocked.
            </Notice>
          </aside>
        </div>
      </div>
    </>
  );
}
