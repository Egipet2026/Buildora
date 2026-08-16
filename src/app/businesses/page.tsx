import { BrowsePage, type SearchParams } from "@/components/browse";
import { Notice } from "@/components/ui";

export const metadata = {
  title: "Buy a Business",
  description:
    "Browse businesses for sale — SaaS, e-commerce, apps, agencies, local businesses and more. Filter by price, revenue, profit, country and category.",
};

export default async function BusinessesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="business"
      eyebrow="Buy a business"
      title="Businesses for sale"
      description="Acquire a company that already has customers, revenue and a track record. Filter by the numbers that matter and talk to the seller directly."
      searchParams={await searchParams}
      basePath="/businesses"
      showFinancials
      notice={
        <Notice tone="gold" title="Before you make an offer">
          Revenue and profit figures are supplied by the seller. Ask for bank
          statements, merchant reports and filed accounts, and have a
          professional review them. A Verified badge means Bizora confirmed
          specific details the seller evidenced — it is not an audit and not an
          opinion on whether the business is a good buy.
        </Notice>
      }
    />
  );
}
