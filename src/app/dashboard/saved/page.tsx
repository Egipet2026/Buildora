import { ListingGrid } from "@/components/listing-card";
import { EmptyState, SectionHead } from "@/components/ui";
import { getCurrentUser, getFavoriteIds, getFavoriteListings } from "@/lib/data";
import { MARKETPLACE_BY_KIND } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";

export const metadata = { title: "Saved listings" };

export default async function SavedPage() {
  const me = (await getCurrentUser())!;
  const [saved, savedIds] = await Promise.all([
    getFavoriteListings(me.id),
    getFavoriteIds(me.id),
  ]);

  if (!saved.length) {
    return (
      <EmptyState
        icon="☆"
        title="No saved listings"
        description="Tap the star on any listing to keep it here. Saved listings are private to you."
        action={{ href: "/marketplace", label: "Browse the marketplace" }}
      />
    );
  }

  // Grouped by marketplace so a mixed watchlist stays readable.
  const groups = new Map<ListingKind, typeof saved>();
  for (const listing of saved) {
    groups.set(listing.kind, [...(groups.get(listing.kind) ?? []), listing]);
  }

  return (
    <div className="space-y-12">
      {[...groups.entries()].map(([kind, listings]) => (
        <div key={kind}>
          <SectionHead
            title={MARKETPLACE_BY_KIND[kind]?.name ?? kind}
            action={{
              href: `/${MARKETPLACE_BY_KIND[kind]?.slug ?? "marketplace"}`,
              label: "Find more",
            }}
          />
          <ListingGrid
            listings={listings}
            savedIds={savedIds}
            redirectTo="/dashboard/saved"
          />
        </div>
      ))}
    </div>
  );
}
