import { redirect } from "next/navigation";
import { ChecklistPicker } from "@/components/checklist-picker";
import { MilestoneBoard } from "@/components/milestone-board";
import { Notice } from "@/components/ui";
import { getCurrentUser, getMilestones, getMyBusiness } from "@/lib/data";

export const metadata = { title: "Build plan" };

export default async function WorkspacePlanPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);
  if (!business) return null;

  const milestones = await getMilestones(business.id);

  return (
    <div className="space-y-8">
      <MilestoneBoard milestones={milestones} />

      <ChecklistPicker />

      <Notice tone="gold" title="A checklist is not a guarantee">
        The starter checklists are a common order of work, not advice. Ticking
        every step does not mean a business will succeed, and anything that
        depends on local law — registration, licences, permits, VAT — should be
        confirmed with a qualified professional in your country.
      </Notice>
    </div>
  );
}
