import { BrowsePage, type SearchParams } from "@/components/browse";

export const metadata = { title: "AI Tools" };

export default async function AiToolsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="ai_tool"
      eyebrow="AI tools"
      title="AI you can plug in this week"
      description="Agents, automations, content and data tools — sold outright or licensed annually, self-hosted or managed."
      searchParams={await searchParams}
      basePath="/ai-tools"
      showDealTypes
    />
  );
}
