import { BrowsePage, type SearchParams } from "@/components/browse";

export const metadata = { title: "Marketplace" };

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      eyebrow="Everything"
      title="Explore the marketplace"
      description="Every listing on Buildora in one place — businesses, patents and technologies, digital assets, services, partners, ideas, suppliers, AI tools and marketing."
      searchParams={await searchParams}
      basePath="/marketplace"
      showFinancials
      showDealTypes
    />
  );
}
