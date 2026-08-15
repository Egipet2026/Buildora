import Link from "next/link";
import { ModerateListing } from "@/components/admin-actions";
import { EmptyState } from "@/components/ui";
import { getListings } from "@/lib/data";
import { formatMoney, timeAgo } from "@/lib/money";
import { MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import { isFeaturedNow } from "@/lib/filters";
import type { ListingStatus } from "@/lib/types";
import type { SearchParams } from "@/components/browse";

export const metadata = { title: "Listing moderation" };

const ALL: ListingStatus[] = [
  "pending",
  "active",
  "rejected",
  "sold",
  "archived",
  "draft",
];

const STATUS_BADGE: Record<ListingStatus, string> = {
  draft: "badge-neutral",
  pending: "badge-brand",
  active: "badge-verified",
  rejected: "badge-danger",
  sold: "badge-neutral",
  archived: "badge-neutral",
};

export default async function AdminListingsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const filter = (Array.isArray(sp.status) ? sp.status[0] : sp.status) ?? "pending";
  const statuses = ALL.includes(filter as ListingStatus)
    ? [filter as ListingStatus]
    : ALL;

  const listings = await getListings({ statuses, sort: "newest" });

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {["pending", "active", "rejected", "sold", "all"].map((status) => (
          <Link
            key={status}
            href={`/admin/listings?status=${status}`}
            className={`badge capitalize ${
              filter === status ? "badge-brand" : "badge-neutral"
            }`}
          >
            {status}
          </Link>
        ))}
      </div>

      {listings.length ? (
        <div className="card table-wrap">
          <table className="data-table !min-w-[900px]">
            <thead>
              <tr>
                <th>Listing</th>
                <th>Seller</th>
                <th>Marketplace</th>
                <th>Price</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((l) => (
                <tr key={l.id}>
                  <td className="max-w-64">
                    <Link
                      href={`/listing/${l.id}`}
                      className="font-medium text-[var(--color-ink)] hover:text-[var(--color-brand)]"
                    >
                      {l.title}
                    </Link>
                    <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-3)]">
                      {timeAgo(l.created_at)}
                    </p>
                  </td>
                  <td>
                    {l.owner.full_name}
                    {l.owner.is_blocked ? (
                      <span className="badge badge-danger ml-1.5">Blocked</span>
                    ) : null}
                  </td>
                  <td>{MARKETPLACE_BY_KIND[l.kind]?.name ?? l.kind}</td>
                  <td>{l.price_cents ? formatMoney(l.price_cents, l.currency) : "—"}</td>
                  <td>
                    <div className="flex flex-col gap-1">
                      <span className={`badge ${STATUS_BADGE[l.status]} self-start`}>
                        {l.status}
                      </span>
                      {l.is_verified ? (
                        <span className="badge badge-verified self-start">
                          Verified
                        </span>
                      ) : null}
                      {isFeaturedNow(l) ? (
                        <span className="badge badge-featured self-start">
                          Featured
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <ModerateListing
                      listingId={l.id}
                      status={l.status}
                      isVerified={l.is_verified}
                      isFeatured={l.is_featured}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon="✓"
          title="Nothing here"
          description="No listings match this filter."
        />
      )}
    </div>
  );
}
