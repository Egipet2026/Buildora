import Link from "next/link";
import { ListingGrid } from "@/components/listing-card";
import { EmptyState, SectionHead, Stat } from "@/components/ui";
import {
  getConversationViews,
  getCurrentUser,
  getFavoriteIds,
  getFavoriteListings,
  getListings,
  getNotifications,
  getOfferThreads,
  getTransactions,
} from "@/lib/data";
import { formatMoney, timeAgo } from "@/lib/money";
import { MARKETPLACES } from "@/lib/taxonomy";

export const metadata = { title: "Buyer dashboard" };

export default async function DashboardPage() {
  const me = (await getCurrentUser())!;

  const [saved, savedIds, offers, conversations, transactions, notifications] =
    await Promise.all([
      getFavoriteListings(me.id),
      getFavoriteIds(me.id),
      getOfferThreads(me.id, "buyer"),
      getConversationViews(me.id),
      getTransactions(),
      getNotifications(me.id),
    ]);

  const purchases = transactions.filter((t) => t.buyer_id === me.id);
  const spent = purchases
    .filter((t) => t.status !== "cancelled")
    .reduce((n, t) => n + t.amount_cents, 0);
  const openOffers = offers.filter((t) => t.latest.status === "pending");
  const unread = conversations.reduce((n, c) => n + c.unreadCount, 0);

  // Suggestions drawn from the marketplaces the buyer has saved from.
  const savedKinds = new Set(saved.map((l) => l.kind));
  const suggestions = await getListings({
    kind: savedKinds.size === 1 ? [...savedKinds][0] : undefined,
    sort: "popular",
    limit: 3,
  });

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Saved listings" value={saved.length} />
        <Stat label="Open offers" value={openOffers.length} tone="brand" />
        <Stat label="Unread messages" value={unread} />
        <Stat
          label="Committed"
          value={formatMoney(spent)}
          hint="Test transactions"
        />
      </div>

      {openOffers.length ? (
        <div>
          <SectionHead
            title="Live negotiations"
            action={{ href: "/dashboard/offers", label: "All offers" }}
          />
          <div className="space-y-3">
            {openOffers.slice(0, 3).map((thread) => (
              <Link
                key={thread.root.id}
                href="/dashboard/offers"
                className="card card-hover flex flex-wrap items-center justify-between gap-4 p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {thread.listing?.title ?? "Listing removed"}
                  </p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                    {thread.counterparty?.full_name ?? "Seller"} ·{" "}
                    {timeAgo(thread.latest.created_at)}
                  </p>
                </div>
                <p className="display text-xl">
                  {formatMoney(
                    thread.latest.amount_cents,
                    thread.listing?.currency,
                  )}
                </p>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div>
        <SectionHead
          title="Recently saved"
          action={{ href: "/dashboard/saved", label: "All saved" }}
        />
        {saved.length ? (
          <ListingGrid
            listings={saved.slice(0, 3)}
            savedIds={savedIds}
            redirectTo="/dashboard"
          />
        ) : (
          <EmptyState
            icon="☆"
            title="Nothing saved yet"
            description="Save listings as you browse and they collect here so you can compare them side by side."
            action={{ href: "/marketplace", label: "Browse the marketplace" }}
          />
        )}
      </div>

      {suggestions.length ? (
        <div>
          <SectionHead
            title="You might also look at"
            description="Popular listings, weighted toward the marketplaces you have been saving from."
          />
          <ListingGrid
            listings={suggestions}
            savedIds={savedIds}
            redirectTo="/dashboard"
          />
        </div>
      ) : null}

      <div>
        <SectionHead
          title="Keep exploring"
          description="Every marketplace on BizHub."
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {MARKETPLACES.map((m) => (
            <Link
              key={m.slug}
              href={`/${m.slug}`}
              className="card card-hover p-4"
            >
              <span className="text-xl" aria-hidden>
                {m.icon}
              </span>
              <span className="mt-2 block text-[0.8125rem] font-medium leading-snug">
                {m.name}
              </span>
            </Link>
          ))}
        </div>
      </div>

      {notifications.length ? (
        <div>
          <SectionHead
            title="Latest activity"
            action={{ href: "/dashboard/notifications", label: "All notifications" }}
          />
          <div className="card divide-y divide-[var(--color-line)]">
            {notifications.slice(0, 4).map((n) => (
              <div key={n.id} className="flex items-start gap-3 p-4">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    n.is_read ? "bg-[var(--color-line-2)]" : "bg-[var(--color-brand)]"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.875rem] font-medium">{n.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                    {n.body}
                  </p>
                </div>
                <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-3)]">
                  {timeAgo(n.created_at)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
