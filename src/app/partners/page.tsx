import { BrowsePage, type SearchParams } from "@/components/browse";
import { Notice } from "@/components/ui";

export const metadata = {
  title: "Business Partners",
  description:
    "Find a co-founder, operating partner, technical partner or distribution partner. Filter by industry, country, skills, experience and commitment.",
};

export default async function PartnersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="partner"
      eyebrow="Business partners"
      title="Find someone to build with"
      description="Founders looking for co-founders, operators, technical partners and distribution partners — with the commitment and capital expectations stated up front."
      searchParams={await searchParams}
      basePath="/partners"
      notice={
        <Notice tone="gold" title="Partnership is not investment">
          These listings are for working partnerships. BizHub does not host
          offers of securities, shares or investment opportunities, and nothing
          here should be treated as one. Where a partnership involves capital,
          equity or profit-sharing, both sides should take independent legal and
          tax advice and comply with the rules that apply in their jurisdiction.
        </Notice>
      }
    />
  );
}
