import { redirect } from "next/navigation";
import { GoalForm } from "@/components/ecosystem/forms";
import { GoalBar } from "@/components/trend-chart";
import { EmptyState, Notice, SectionHead } from "@/components/ui";
import { deleteGoalAction } from "@/lib/ecosystem/actions";
import { getCurrentUser, getGoals, getMyBusiness } from "@/lib/data";
import { formatDate } from "@/lib/money";

export const metadata = { title: "Goals" };

export default async function GoalsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);
  if (!business) return null;

  const goals = await getGoals(business.id);
  const hit = goals.filter((g) => g.current >= g.target).length;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Goals"
        description={
          goals.length
            ? `${hit} of ${goals.length} reached. Update the numbers as they change — nothing here is measured automatically.`
            : "Set what you are aiming at, then keep the numbers current."
        }
      />

      {goals.length ? (
        <div className="space-y-4">
          {goals.map((goal) => (
            <div key={goal.id} className="card p-5 lg:p-6">
              <GoalBar
                label={goal.label}
                current={goal.current}
                target={goal.target}
                money={goal.kind === "revenue"}
              />
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-line)] pt-3.5">
                <p className="text-[0.75rem] text-[var(--color-ink-3)]">
                  {goal.due_on ? `Target date ${formatDate(goal.due_on)}` : "No target date"}
                </p>
                <div className="flex gap-2">
                  <GoalForm goal={goal} />
                  <form action={deleteGoalAction}>
                    <input type="hidden" name="id" value={goal.id} />
                    <button
                      type="submit"
                      className="btn btn-ghost btn-sm text-[var(--color-danger)]"
                    >
                      Remove
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="◎"
          title="No goals set"
          description="A revenue target, a customer count, a hiring plan — anything you want to measure against."
        />
      )}

      <GoalForm />

      <Notice tone="neutral" title="These are your own numbers">
        Bizora does not connect to your bank, your shop or your accounting
        system. Everything on this page is what you typed, so it is a private
        record for you rather than evidence for anyone else.
      </Notice>
    </div>
  );
}
