import { OfferThreadCard } from "@/components/offer-thread";
import { EmptyState, Notice } from "@/components/ui";
import { getCurrentUser, getOfferThreads, getSettings } from "@/lib/data";

export const metadata = { title: "Offers received" };

export default async function SellerOffersPage() {
  const me = (await getCurrentUser())!;
  const [threads, settings] = await Promise.all([
    getOfferThreads(me.id, "seller"),
    getSettings(),
  ]);

  if (!threads.length) {
    return (
      <EmptyState
        icon="⇄"
        title="No offers yet"
        description="Offers on your listings appear here with the full negotiation history and the commission split at every price."
        action={{ href: "/seller/promotions", label: "Promote a listing" }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <Notice tone="neutral">
        Accepting an offer signals agreement on price and unlocks any documents
        you marked “after an accepted offer”. It is not a contract of sale —
        complete the transaction under written terms agreed with the buyer.
      </Notice>

      {threads.map((thread) => (
        <OfferThreadCard
          key={thread.root.id}
          history={thread.history}
          latest={thread.latest}
          role="seller"
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
