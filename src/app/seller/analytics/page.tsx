import Link from "next/link";
import { EmptyState, Notice, SectionHead, Stat } from "@/components/ui";
import {
  getCurrentUser,
  getListings,
  getOffers,
  getSellerStats,
  getTransactions,
} from "@/lib/data";
import { formatMoney, formatNumber } from "@/lib/money";

export const metadata = { title: "Analytics" };

export default async function SellerAnalyticsPage() {
  const me = (await getCurrentUser())!;
  const [stats, listings, offers, transactions] = await Promise.all([
    getSellerStats(me.id),
    getListings({
      ownerId: me.id,
      statuses: ["active", "sold", "pending"],
      sort: "popular",
    }),
    getOffers(),
    getTransactions(),
  ]);

  if (!listings.length) {
    return (
      <EmptyState
        icon="◔"
        title="No data yet"
        description="Analytics appear once you have a live listing collecting views and saves."
        action={{ href: "/sell", label: "Create a listing" }}
      />
    );
  }

  const myOffers = offers.filter((o) => o.seller_id === me.id);
  const mySales = transactions.filter(
    (t) => t.seller_id === me.id && t.status !== "cancelled",
  );
  const bestPrice = Math.max(0, ...myOffers.map((o) => o.amount_cents));
  const peak = listings.reduce(
    (best, l) => (l.views_count > (best?.views_count ?? -1) ? l : best),
    listings[0],
  );

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Total views" value={formatNumber(stats.views)} />
        <Stat label="Total saves" value={formatNumber(stats.saves)} />
        <Stat label="Offers received" value={myOffers.length} tone="brand" />
        <Stat
          label="Highest offer"
          value={bestPrice ? formatMoney(bestPrice) : "—"}
          tone="accent"
        />
      </div>

      <div>
        <SectionHead
          title="Listing performance"
          description="Views, saves and offers per listing. Save rate is the sharpest early signal of whether the price is credible."
        />
        <div className="card table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Views</th>
                <th>Saves</th>
                <th>Save rate</th>
                <th>Offers</th>
                <th>Best offer</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => {
                const forListing = myOffers.filter((o) => o.listing_id === l.id);
                const best = Math.max(
                  0,
                  ...forListing.map((o) => o.amount_cents),
                );
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
                    <td>{formatNumber(l.views_count)}</td>
                    <td>{formatNumber(l.saves_count)}</td>
                    <td>
                      {l.views_count
                        ? `${((l.saves_count / l.views_count) * 100).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td>{forListing.length}</td>
                    <td>{best ? formatMoney(best, l.currency) : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <SectionHead title="Earnings" />
        <div className="grid gap-3.5 sm:grid-cols-3">
          <Stat
            label="Gross value"
            value={formatMoney(
              mySales.reduce((n, t) => n + t.amount_cents, 0),
            )}
          />
          <Stat
            label="Platform fees"
            value={formatMoney(mySales.reduce((n, t) => n + t.fee_cents, 0))}
            tone="danger"
          />
          <Stat
            label="Net to you"
            value={formatMoney(mySales.reduce((n, t) => n + t.net_cents, 0))}
            tone="accent"
          />
        </div>
      </div>

      {peak ? (
        <Notice tone="brand" title="What the numbers suggest">
          Your strongest listing is <strong>{peak.title}</strong> with{" "}
          {formatNumber(peak.views_count)} views and{" "}
          {formatNumber(peak.saves_count)} saves. A high view count with few
          saves usually means the price or the summary is doing the wrong work;
          saves without offers usually means buyers want evidence you have not
          published yet.
        </Notice>
      ) : null}
    </div>
  );
}
