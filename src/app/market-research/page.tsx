import Link from "next/link";
import { MarketResearchTool } from "@/components/market-research";
import { PageHeader } from "@/components/ui";

export const metadata = {
  title: "Market research",
  description:
    "An indicative overview of how a market works — competitors, buyers, opportunities, risks and where a new entrant could be different.",
};

export default function MarketResearchPage() {
  return (
    <>
      <PageHeader
        eyebrow="Research"
        title="Market research"
        description="Before you build anything, understand who already serves this customer and how they buy. This is a starting point for that work — not a substitute for talking to twenty of them yourself."
      >
        <Link href="/start-a-business" className="btn btn-outline">
          Draft a business plan
        </Link>
        <Link href="/tools" className="btn btn-outline">
          Run the numbers
        </Link>
      </PageHeader>

      <div className="shell py-10">
        <MarketResearchTool />
      </div>
    </>
  );
}
