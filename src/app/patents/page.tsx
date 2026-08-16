import Link from "next/link";
import { BrowsePage, type SearchParams } from "@/components/browse";
import { Notice } from "@/components/ui";

export const metadata = {
  title: "Patents & Technologies",
  description:
    "Buy rights to or license patented technology — green tech, energy, AI, robotics, medical technology, water technology and more.",
};

export default async function PatentsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="patent"
      eyebrow="Intellectual property"
      title="Patents & technologies"
      description="Acquire rights outright, or license a technology exclusively or non-exclusively. Every listing states its patent or application number, jurisdiction, legal status and rights holder."
      searchParams={await searchParams}
      basePath="/patents"
      showDealTypes
      notice={
        <Notice tone="brand" title="How patent listings work here">
          <p className="mb-2">
            Sellers must confirm they hold the rights they are offering. A
            pending application is always labelled as pending and can never be
            presented as a granted patent.
          </p>
          <p>
            Where a listing is verified, Bizora has confirmed the stated number,
            jurisdiction, status and recorded holder against the public register
            — to the extent it can lawfully do so. That is a check on the
            paperwork, not a validity opinion, a freedom-to-operate opinion, or
            a view on what the technology is worth.{" "}
            <Link href="/legal/verification" className="font-medium underline">
              What verification means
            </Link>
            .
          </p>
        </Notice>
      }
    />
  );
}
