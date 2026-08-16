import Link from "next/link";
import { redirect } from "next/navigation";
import { WatchButton } from "@/components/watch-button";
import { Cover, EmptyState, Notice, SectionHead } from "@/components/ui";
import { getCurrentUser, getWatchlist } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata = { title: "Watchlist" };

export default async function WatchlistPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const items = await getWatchlist(me.id);

  return (
    <div className="space-y-8">
      <SectionHead
        title="Watchlist"
        description="Listings you are tracking. When an asking price falls, Bizora tells you — and shows you what it was when you added it."
      />

      {items.length ? (
        <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {items.map(({ item, listing }) => {
            const then = item.price_when_added_cents;
            const now = listing.price_cents;
            const changed = then !== null && now !== null && now !== then;
            const dropped = changed && now < then;

            return (
              <div
                key={item.id}
                className="flex flex-wrap items-start gap-4 p-5"
              >
                <Cover
                  seed={listing.id}
                  label={listing.title}
                  className="h-16 w-24 shrink-0"
                />

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/listing/${listing.id}`}
                    className="font-semibold leading-snug hover:text-[var(--color-brand)]"
                  >
                    {listing.title}
                  </Link>
                  <p className="mt-1 text-[0.75rem] text-[var(--color-ink-3)]">
                    Added {formatDate(item.created_at)} · {listing.country}
                    {listing.status !== "active" ? " · no longer listed" : ""}
                  </p>

                  <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="text-[1.0625rem] font-semibold">
                      {now === null ? "Open to offers" : formatMoney(now, listing.currency)}
                    </span>
                    {changed ? (
                      <>
                        <span className="text-[0.8125rem] text-[var(--color-ink-3)] line-through">
                          {formatMoney(then!, listing.currency)}
                        </span>
                        <span
                          className={
                            dropped
                              ? "badge badge-verified"
                              : "badge badge-gold"
                          }
                        >
                          {dropped ? "▼" : "▲"}{" "}
                          {Math.abs(Math.round(((now! - then!) / then!) * 100))}%
                        </span>
                      </>
                    ) : (
                      <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                        unchanged since you added it
                      </span>
                    )}
                  </div>
                </div>

                <div className="w-full shrink-0 sm:w-40">
                  <WatchButton
                    listingId={listing.id}
                    watching
                    className="btn btn-ghost btn-sm w-full"
                  />
                  <Link
                    href={`/listing/${listing.id}`}
                    className="btn btn-outline btn-sm mt-2 w-full"
                  >
                    Open
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon="◎"
          title="Nothing on your watchlist"
          description="Open any listing and press “Watch the price”. Bizora will tell you if the seller drops it."
          action={{ href: "/businesses", label: "Browse businesses" }}
        />
      )}

      <Notice tone="neutral" title="Watching is not the same as saving">
        A favourite is a bookmark you come back to. A watch is a request to be
        notified when the asking price changes. A price cut is not by itself a
        reason to buy — it can just as easily mean the seller is struggling to
        find one.
      </Notice>
    </div>
  );
}
