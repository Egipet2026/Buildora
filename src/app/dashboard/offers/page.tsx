import { OfferThreadCard } from "@/components/offer-thread";
import { EmptyState, Notice } from "@/components/ui";
import { getCurrentUser, getOfferThreads, getSettings } from "@/lib/data";

export const metadata = { title: "My offers" };

export default async function BuyerOffersPage() {
  const me = (await getCurrentUser())!;
  const [threads, settings] = await Promise.all([
    getOfferThreads(me.id, "buyer"),
    getSettings(),
  ]);

  if (!threads.length) {
    return (
      <EmptyState
        icon="⇄"
        title="You haven't made any offers"
        description="When you make an offer on a listing, the whole negotiation — every counter, in order — lives here."
        action={{ href: "/businesses", label: "Find a business" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Notice tone="neutral">
        An offer starts a negotiation. It is not a binding contract, and an
        acceptance on Bizora is not a contract of sale — the transaction is
        completed between you and the seller under written terms you agree
        separately.
      </Notice>

      {threads.map((thread) => (
        <OfferThreadCard
          key={thread.root.id}
          history={thread.history}
          latest={thread.latest}
          role="buyer"
          meId={me.id}
          counterparty={thread.counterparty}
          listing={
            thread.listing
              ? {
                  id: thread.listing.id,
                  title: thread.listing.title,
                  currency: thread.listing.currency,
                }
              : null
          }
          commissionBps={settings.commission_bps}
        />
      ))}
    </div>
  );
}
