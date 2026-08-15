import Link from "next/link";
import { EmptyState, Notice } from "@/components/ui";
import { getCurrentUser, getListings } from "@/lib/data";
import { formatDate, formatMoney, formatNumber } from "@/lib/money";
import { isFeaturedNow } from "@/lib/filters";
import { MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import type { ListingStatus } from "@/lib/types";
import type { SearchParams } from "@/components/browse";

export const metadata = { title: "My listings" };

const STATUS_BADGE: Record<ListingStatus, string> = {
  draft: "badge-neutral",
  pending: "badge-brand",
  active: "badge-verified",
  rejected: "badge-danger",
  sold: "badge-neutral",
  archived: "badge-neutral",
};

export default async function SellerListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const submitted = Array.isArray(sp.submitted) ? sp.submitted[0] : sp.submitted;

  const me = (await getCurrentUser())!;
  const listings = await getListings({
    ownerId: me.id,
    statuses: ["draft", "pending", "active", "rejected", "sold", "archived"],
  });

  if (!listings.length) {
    return (
      <EmptyState
        icon="◫"
        title="No listings yet"
        description="Everything you list — businesses, patents, digital assets, services — is managed from here."
        action={{ href: "/sell", label: "Create your first listing" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      {submitted ? (
        <Notice tone="brand" title="Listing submitted">
          A moderator will review it, usually within one working day. You will
          get a notification either way — and if it is not approved, you will be
          told exactly why.
        </Notice>
      ) : null}

      <div className="card table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Listing</th>
              <th>Marketplace</th>
              <th>Status</th>
              <th>Price</th>
              <th>Views</th>
              <th>Saves</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {listings.map((l) => (
              <tr key={l.id}>
                <td className="max-w-72">
                  <Link
                    href={`/listing/${l.id}`}
                    className="font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)]"
                  >
                    {l.title}
                  </Link>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {isFeaturedNow(l) ? (
                      <span className="badge badge-featured">Featured</span>
                    ) : null}
                    {l.is_verified ? (
                      <span className="badge badge-verified">Verified</span>
                    ) : null}
                  </div>
                  {l.status === "rejected" && l.rejection_reason ? (
                    <p className="mt-1.5 text-[0.75rem] text-[var(--color-danger)]">
                      {l.rejection_reason}
                    </p>
                  ) : null}
                </td>
                <td>{MARKETPLACE_BY_KIND[l.kind]?.name ?? l.kind}</td>
                <td>
                  <span className={`badge ${STATUS_BADGE[l.status]}`}>
                    {l.status}
                  </span>
                </td>
                <td>{l.price_cents ? formatMoney(l.price_cents, l.currency) : "—"}</td>
                <td>{formatNumber(l.views_count)}</td>
                <td>{formatNumber(l.saves_count)}</td>
                <td className="whitespace-nowrap">{formatDate(l.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
