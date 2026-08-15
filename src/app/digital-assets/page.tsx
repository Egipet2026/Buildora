import { BrowsePage, type SearchParams } from "@/components/browse";

export const metadata = {
  title: "SaaS, Apps & Digital Assets",
  description:
    "Buy websites, domains, SaaS products, mobile apps, APIs, templates, source-code projects and AI tools.",
};

export default async function DigitalAssetsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="digital_asset"
      eyebrow="Digital assets"
      title="Websites, SaaS, apps & domains"
      description="Ready-made digital property: revenue-generating SaaS, mobile apps, APIs, source-code projects, premium domains and templates."
      searchParams={await searchParams}
      basePath="/digital-assets"
      showFinancials
      showDealTypes
    />
  );
}
