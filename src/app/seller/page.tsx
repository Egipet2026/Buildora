import Link from "next/link";
import { EmptyState, SectionHead, Stat } from "@/components/ui";
import {
  getCurrentUser,
  getListings,
  getOfferThreads,
  getSellerStats,
} from "@/lib/data";
import { formatMoney, formatNumber, timeAgo } from "@/lib/money";

export const metadata = { title: "Seller dashboard" };

export default async function SellerOverviewPage() {
  const me = (await getCurrentUser())!;

  const [stats, listings, offers] = await Promise.all([
    getSellerStats(me.id),
    getListings({
      ownerId: me.id,
      statuses: ["draft", "pending", "active", "rejected", "sold", "archived"],
    }),
    getOfferThreads(me.id, "seller"),
  ]);

  const openOffers = offers.filter((t) => t.latest.status === "pending");

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Active listings" value={stats.active} />
        <Stat label="Awaiting review" value={stats.pending} tone="brand" />
        <Stat label="Open offers" value={openOffers.length} tone="brand" />
        <Stat
          label="Net proceeds"
          value={formatMoney(stats.revenueCents)}
          hint={`After ${formatMoney(stats.feesCents)} in fees`}
          tone="accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Total views" value={formatNumber(stats.views)} />
        <Stat label="Total saves" value={formatNumber(stats.saves)} />
        <Stat label="Sold" value={stats.sold} />
        <Stat
          label="Save rate"
          value={stats.views ? `${((stats.saves / stats.views) * 100).toFixed(1)}%` : "—"}
          hint="Saves ÷ views"
        />
      </div>

      {openOffers.length ? (
        <div>
          <SectionHead
            title="Offers waiting on you"
            action={{ href: "/seller/offers", label: "All offers" }}
          />
          <div className="space-y-3">
            {openOffers.slice(0, 4).map((thread) => (
              <Link
                key={thread.root.id}
                href="/seller/offers"
                className="card card-hover flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {thread.listing?.title ?? "Listing removed"}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                    {thread.counterparty?.full_name ?? "Buyer"} ·{" "}
                    {timeAgo(thread.latest.created_at)}
                  </p>
                </div>
                <p className="display text-xl">
                  {formatMoney(thread.latest.amount_cents, thread.listing?.currency)}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionHead
          title="Your listings"
          action={{ href: "/seller/listings", label: "Manage all" }}
        />
        {listings.length ? (
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Listing</th>
                  <th>Status</th>
                  <th>Price</th>
                  <th>Views</th>
                  <th>Saves</th>
                </tr>
              </thead>
              <tbody>
                {listings.slice(0, 6).map((l) => (
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
                      <span className="badge badge-neutral">{l.status}</span>
                    </td>
                    <td>{l.price_cents ? formatMoney(l.price_cents, l.currency) : "—"}</td>
                    <td>{formatNumber(l.views_count)}</td>
                    <td>{formatNumber(l.saves_count)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon="◫"
            title="You have no listings yet"
            description="Create your first listing — it's free, and you only pay a commission when a transaction completes."
            action={{ href: "/sell", label: "Create a listing" }}
          />
        )}
      </div>
    </div>
  );
}
