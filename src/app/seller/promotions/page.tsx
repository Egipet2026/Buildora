import Link from "next/link";
import { PromoteForm } from "@/components/seller-tools";
import { EmptyState, Notice, SectionHead } from "@/components/ui";
import { getCurrentUser, getListings, getSettings } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";
import { isFeaturedNow } from "@/lib/filters";
import { paymentsEnabled } from "@/lib/payments/stripe";

export const metadata = { title: "Featured & Boost" };

export default async function PromotionsPage() {
  const me = (await getCurrentUser())!;
  const [listings, settings] = await Promise.all([
    getListings({ ownerId: me.id, statuses: ["active"] }),
    getSettings(),
  ]);

  if (!listings.length) {
    return (
      <EmptyState
        icon="✦"
        title="No active listings to promote"
        description="Promotion applies to listings that are already live. Create one and it becomes available here once approved."
        action={{ href: "/sell", label: "Create a listing" }}
      />
    );
  }

  const promoted = listings.filter(
    (l) =>
      isFeaturedNow(l) ||
      (l.boosted_until && new Date(l.boosted_until).getTime() > Date.now()),
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <PromoteForm
        listings={listings.map((l) => ({ id: l.id, title: l.title }))}
        featuredPrice={formatMoney(settings.featured_price_cents)}
        featuredDays={settings.featured_days}
        boostTiers={settings.boost_tiers.map((tier) => ({
          days: tier.days,
          price: formatMoney(tier.price_cents),
        }))}
        payByCard={paymentsEnabled()}
      />

      <div className="space-y-8">
        <div>
          <SectionHead title="Currently promoted" />
          {promoted.length ? (
            <div className="card table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Placement</th>
                    <th>Runs until</th>
                  </tr>
                </thead>
                <tbody>
                  {promoted.map((l) => {
                    const boosted =
                      l.boosted_until &&
                      new Date(l.boosted_until).getTime() > Date.now();
                    return (
                      <tr key={l.id}>
                        <td className="font-medium text-[var(--color-ink)]">
                          <Link
                            href={`/listing/${l.id}`}
                            className="hover:text-[var(--color-brand)]"
                          >
                            {l.title}
                          </Link>
                        </td>
                        <td>
                          {isFeaturedNow(l) ? (
                            <span className="badge badge-featured">Featured</span>
                          ) : null}{" "}
                          {boosted ? (
                            <span className="badge badge-brand">Boosted</span>
                          ) : null}
                        </td>
                        <td>
                          {formatDate(
                            (isFeaturedNow(l) ? l.featured_until : l.boosted_until) ??
                              "",
                          ) || "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="card p-8 text-center text-[0.875rem] text-[var(--color-ink-3)]">
              None of your listings are currently promoted.
            </div>
          )}
        </div>

        <Notice tone="gold" title="What promotion does and does not do">
          Featured and Boost buy attention, nothing else. They put your listing
          in front of more people; they do not change how buyers judge the
          business, and they are labelled as paid placement wherever they
          appear. If a listing gets views but no offers, promotion will not fix
          it — the price or the evidence will.
        </Notice>
      </div>
    </div>
  );
}
