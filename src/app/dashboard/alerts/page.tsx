import { redirect } from "next/navigation";
import { AlertForm } from "@/components/ecosystem/forms";
import { EmptyState, Notice, SectionHead } from "@/components/ui";
import { deleteAlertAction, toggleAlertAction } from "@/lib/ecosystem/actions";
import { getAlerts, getCurrentUser } from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";
import { MARKETPLACE_BY_KIND } from "@/lib/taxonomy";

export const metadata = { title: "Opportunity alerts" };

export default async function AlertsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const alerts = await getAlerts(me.id);

  return (
    <div className="space-y-8">
      <SectionHead
        title="Opportunity alerts"
        description="Standing searches. Buildora checks each one the moment a listing is approved and notifies you if it matches — no polling, no digest delay."
      />

      <AlertForm />

      {alerts.length ? (
        <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex flex-wrap items-start gap-4 p-5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <p className="font-semibold">{alert.label}</p>
                  <span className={alert.is_active ? "badge badge-verified" : "badge"}>
                    {alert.is_active ? "Active" : "Paused"}
                  </span>
                </div>

                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                  {[
                    alert.query ? `containing “${alert.query}”` : null,
                    alert.kinds.length
                      ? `in ${alert.kinds.map((k) => MARKETPLACE_BY_KIND[k]?.name ?? k).join(", ")}`
                      : "across every marketplace",
                    alert.max_price_cents !== null
                      ? `under ${formatMoney(alert.max_price_cents)}`
                      : null,
                    alert.min_price_cents !== null
                      ? `over ${formatMoney(alert.min_price_cents)}`
                      : null,
                    alert.country ? `in ${alert.country}` : null,
                    alert.verified_only ? "verified only" : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>

                <p className="mt-2 text-[0.75rem] text-[var(--color-ink-3)]">
                  Created {formatDate(alert.created_at)} ·{" "}
                  {alert.notified_listing_ids.length} match
                  {alert.notified_listing_ids.length === 1 ? "" : "es"} so far
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <form action={toggleAlertAction}>
                  <input type="hidden" name="id" value={alert.id} />
                  <button type="submit" className="btn btn-ghost btn-sm">
                    {alert.is_active ? "Pause" : "Resume"}
                  </button>
                </form>
                <form action={deleteAlertAction}>
                  <input type="hidden" name="id" value={alert.id} />
                  <button
                    type="submit"
                    className="btn btn-ghost btn-sm text-[var(--color-danger)]"
                  >
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState
          icon="🔔"
          title="No alerts yet"
          description="“Tell me when a SaaS business under €10,000 is listed.” “Tell me when a patent about renewable energy appears.” Set it once and forget it."
        />
      )}

      <Notice tone="neutral" title="What an alert will and will not do">
        It matches on words, marketplace, price and country at the moment a
        listing is approved. It does not judge whether the listing is any good,
        and a match is not a recommendation — it is a notification that
        something you described has appeared.
      </Notice>
    </div>
  );
}
