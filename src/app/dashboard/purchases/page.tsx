import Link from "next/link";
import { EmptyState, Notice } from "@/components/ui";
import {
  getCurrentUser,
  getListing,
  getProfiles,
  getTransactions,
} from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata = { title: "Purchases" };

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-brand",
  paid: "badge-verified",
  released: "badge-verified",
  cancelled: "badge-danger",
};

export default async function PurchasesPage() {
  const me = (await getCurrentUser())!;
  const [transactions, profiles] = await Promise.all([
    getTransactions(),
    getProfiles(),
  ]);

  const mine = transactions.filter((t) => t.buyer_id === me.id);
  if (!mine.length) {
    return (
      <EmptyState
        icon="◫"
        title="No purchases yet"
        description="Completed transactions appear here with the full commission breakdown."
        action={{ href: "/marketplace", label: "Browse the marketplace" }}
      />
    );
  }

  const rows = await Promise.all(
    mine.map(async (t) => ({
      transaction: t,
      listing: await getListing(t.listing_id),
      seller: profiles.find((p) => p.id === t.seller_id),
    })),
  );

  return (
    <div className="space-y-6">
      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Seller</th>
              <th>Date</th>
              <th>Amount</th>
              <th>Platform fee</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ transaction, listing, seller }) => (
              <tr key={transaction.id}>
                <td className="font-medium text-[var(--color-ink)]">
                  {listing ? (
                    <Link
                      href={`/listing/${listing.id}`}
                      className="hover:text-[var(--color-brand)]"
                    >
                      {listing.title}
                    </Link>
                  ) : (
                    "Listing removed"
                  )}
                </td>
                <td>{seller?.full_name ?? "—"}</td>
                <td>{formatDate(transaction.created_at)}</td>
                <td className="font-semibold text-[var(--color-ink)]">
                  {formatMoney(transaction.amount_cents)}
                </td>
                <td>{formatMoney(transaction.fee_cents)}</td>
                <td>
                  <span
                    className={`badge ${STATUS_BADGE[transaction.status] ?? "badge-neutral"}`}
                  >
                    {transaction.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Notice tone="gold" title="These are test transactions">
        Bizora records the agreed amount and the commission split so both sides
        have the same numbers. It does not take payment, hold funds in escrow or
        transfer ownership — arrange the actual transfer with your own advisers.
      </Notice>
    </div>
  );
}
