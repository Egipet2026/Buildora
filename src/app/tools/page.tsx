import Link from "next/link";
import {
  BreakEvenCalculator,
  ProfitCalculator,
  RoiCalculator,
  ValuationHelper,
} from "@/components/calculators";
import { Notice, PageHeader } from "@/components/ui";

export const metadata = {
  title: "Business calculators",
  description:
    "Profit, break-even, return on investment and an indicative valuation range — arithmetic on your own numbers, with the assumptions stated.",
};

export default function ToolsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Tools"
        title="Business calculators"
        description="Four calculations worth doing before you buy, sell or start anything. Nothing is stored and nothing is sent anywhere — the arithmetic runs in your browser."
      >
        <Link href="/business-profiles/new" className="btn btn-outline">
          Start a business instead
        </Link>
      </PageHeader>

      <div className="shell py-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfitCalculator />
          <BreakEvenCalculator />
          <RoiCalculator />
          <ValuationHelper />
        </div>

        <div className="mt-8">
          <Notice tone="gold" title="Indicative only">
            These are simplified models. They are not financial, tax,
            accounting or investment advice, and they are not a substitute for
            a professional review of real accounts. Every figure they produce
            depends entirely on the numbers you enter — including the ones you
            guessed.
          </Notice>
        </div>
      </div>
    </>
  );
}
