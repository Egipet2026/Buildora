import { BusinessPlanner } from "@/components/business-planner";
import { PageHeader } from "@/components/ui";

export const metadata = {
  title: "Start a Business",
  description:
    "Describe your idea and get an indicative business plan — target customers, business model, required resources, possible costs, roles, marketing and first steps.",
};

export default function StartABusinessPage() {
  return (
    <>
      <PageHeader
        eyebrow="Build a business"
        title="Start a business"
        description="Begin with a sentence. Leave with a plan, and the people, technology and assets to execute it."
      />

      <div className="shell py-10">
        <BusinessPlanner />
      </div>
    </>
  );
}
