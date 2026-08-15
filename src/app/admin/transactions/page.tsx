import Link from "next/link";
import { EmptyState, Notice, Stat } from "@/components/ui";
import { getListing, getProfiles, getTransactions } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata = { title: "Transactions" };

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-brand",
  paid: "badge-verified",
  released: "badge-verified",
  cancelled: "badge-danger",
};

export default async function AdminTransactionsPage() {
  const [transactions, profiles] = await Promise.all([
    getTransactions(),
    getProfiles(),
  ]);

  if (!transactions.length) {
    return (
      <EmptyState
        icon="◫"
        title="No transactions"
        description="Every recorded transaction and the platform fee it generated appears here."
      />
    );
  }

  const settled = transactions.filter((t) => t.status !== "cancelled");
  const gmv = settled.reduce((n, t) => n + t.amount_cents, 0);
  const fees = settled.reduce((n, t) => n + t.fee_cents, 0);

  const rows = await Promise.all(
    transactions.map(async (t) => ({
      transaction: t,
      listing: await getListing(t.listing_id),
      buyer: profiles.find((p) => p.id === t.buyer_id),
      seller: profiles.find((p) => p.id === t.seller_id),
    })),
  );

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Transactions" value={transactions.length} />
        <Stat label="Gross value" value={formatMoney(gmv)} />
        <Stat label="Platform fees" value={formatMoney(fees)} tone="accent" />
        <Stat
          label="Effective rate"
          value={gmv ? `${((fees / gmv) * 100).toFixed(1)}%` : "—"}
        />
      </div>

      <div className="card table-wrap">
        <table className="data-table !min-w-[900px]">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Buyer</th>
              <th>Seller</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Fee</th>
              <th>Net</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ transaction: t, listing, buyer, seller }) => (
              <tr key={t.id}>
                <td className="max-w-56 truncate font-medium text-[var(--color-ink)]">
                  {listing ? (
                    <Link
                      href={`/listing/${listing.id}`}
                      className="hover:text-[var(--color-brand)]"
                    >
                      {listing.title}
                    </Link>
                  ) : (
                    "Removed"
                  )}
                </td>
                <td>{buyer?.full_name ?? "—"}</td>
                <td>{seller?.full_name ?? "—"}</td>
                <td className="whitespace-nowrap">{formatDate(t.created_at)}</td>
                <td className="font-semibold text-[var(--color-ink)]">
                  {formatMoney(t.amount_cents)}
                </td>
                <td className="text-[var(--color-accent)]">
                  {formatMoney(t.fee_cents)}
                </td>
                <td>{formatMoney(t.net_cents)}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[t.status]}`}>
                    {t.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Notice tone="gold" title="Provider: mock">
        No payment provider is connected. These records exist so both sides see
        identical numbers and so the commission logic can be verified — no funds
        are collected, held or paid out.
      </Notice>
    </div>
  );
}
