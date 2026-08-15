import { BrowsePage, type SearchParams } from "@/components/browse";

export const metadata = { title: "Marketing" };

export default async function MarketingPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="marketing"
      eyebrow="Marketing"
      title="Growth channels and campaign partners"
      description="Paid acquisition, content and SEO, social, email, influencers and PR — priced per project or per month."
      searchParams={await searchParams}
      basePath="/marketing"
    />
  );
}
