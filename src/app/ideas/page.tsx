import { BrowsePage, type SearchParams } from "@/components/browse";
import { Notice } from "@/components/ui";

export const metadata = { title: "Business Ideas" };

export default async function IdeasPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="idea"
      eyebrow="Business ideas"
      title="Researched concepts, ready to execute"
      description="Validated concepts, customer research and playbooks from people who did the groundwork but decided not to build."
      searchParams={await searchParams}
      basePath="/ideas"
      notice={
        <Notice tone="neutral">
          An idea listing is research and a plan — not a built product, not a
          customer base, and not evidence that a market exists. Read carefully
          what is actually included before paying for one.
        </Notice>
      }
    />
  );
}
