import { BrowsePage, type SearchParams } from "@/components/browse";
import { Notice } from "@/components/ui";

export const metadata = {
  title: "Experts & Services",
  description:
    "Hire developers, designers, marketers, SEO specialists, accountants, lawyers, consultants, copywriters, video editors, AI and sales specialists.",
};

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="service"
      eyebrow="Experts & services"
      title="The specialists your business needs"
      description="Developers, designers, marketers, accountants, lawyers and consultants who work with founders and small teams."
      searchParams={await searchParams}
      basePath="/services"
      notice={
        <Notice tone="neutral">
          Rates shown are indicative starting prices set by each specialist.
          Scope, deliverables and terms are agreed directly between you and
          them. Regulated professionals — lawyers, accountants, auditors — act
          under their own engagement terms and professional rules; nothing on a
          Buildora profile constitutes professional advice.
        </Notice>
      }
    />
  );
}
