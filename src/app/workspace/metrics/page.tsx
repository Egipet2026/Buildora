import { redirect } from "next/navigation";
import { MetricForm } from "@/components/ecosystem/forms";
import { TrendChart } from "@/components/trend-chart";
import { EmptyState, Notice, SectionHead, Stat } from "@/components/ui";
import { getCurrentUser, getMetrics, getMyBusiness } from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "Business dashboard" };

const MONTH_LABEL = (month: string): string => {
  const [year, m] = month.split("-").map(Number);
  return new Date(year, m - 1, 1).toLocaleDateString("en-IE", { month: "short" });
};

export default async function MetricsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);
  if (!business) return null;

  const metrics = await getMetrics(business.id);
  const recent = metrics.slice(-12);
  const latest = recent.at(-1);
  const previous = recent.at(-2);

  const profit = latest ? latest.revenue_cents - latest.expenses_cents : 0;
  const growth =
    latest && previous && previous.revenue_cents > 0
      ? ((latest.revenue_cents - previous.revenue_cents) / previous.revenue_cents) * 100
      : null;

  const now = new Date();
  const defaultMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  return (
    <div className="space-y-8">
      <SectionHead
        title="Business dashboard"
        description="Revenue, expenses, profit and customers over time — from the figures you record each month."
      />

      {recent.length ? (
        <>
          <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
            <Stat
              label="Revenue this month"
              value={formatMoney(latest!.revenue_cents)}
              tone="brand"
            />
            <Stat label="Expenses" value={formatMoney(latest!.expenses_cents)} />
            <Stat
              label="Profit"
              value={formatMoney(profit)}
              hint={profit < 0 ? "Running at a loss" : undefined}
            />
            <Stat
              label="Customers"
              value={latest!.customers}
              hint={
                growth !== null
                  ? `Revenue ${growth >= 0 ? "up" : "down"} ${Math.abs(growth).toFixed(0)}% on last month`
                  : undefined
              }
            />
          </div>

          <div className="card p-6 lg:p-8">
            <h2 className="display mb-5 text-xl">Revenue, expenses and profit</h2>
            <TrendChart
              labels={recent.map((m) => MONTH_LABEL(m.month))}
              series={[
                {
                  label: "Revenue",
                  colour: "var(--color-brand)",
                  money: true,
                  values: recent.map((m) => m.revenue_cents),
                },
                {
                  label: "Expenses",
                  colour: "var(--color-gold)",
                  money: true,
                  values: recent.map((m) => m.expenses_cents),
                },
                {
                  label: "Profit",
                  colour: "var(--color-accent)",
                  money: true,
                  values: recent.map((m) =>
                    Math.max(0, m.revenue_cents - m.expenses_cents),
                  ),
                },
              ]}
            />
          </div>

          <div className="card p-6 lg:p-8">
            <h2 className="display mb-5 text-xl">Customers</h2>
            <TrendChart
              labels={recent.map((m) => MONTH_LABEL(m.month))}
              height={180}
              series={[
                {
                  label: "Customers",
                  colour: "var(--color-brand)",
                  values: recent.map((m) => m.customers),
                },
              ]}
            />
          </div>
        </>
      ) : (
        <EmptyState
          icon="📈"
          title="No figures recorded yet"
          description="Record one month and the chart starts. Two months and it starts telling you something."
        />
      )}

      <MetricForm defaultMonth={defaultMonth} />

      <Notice tone="gold" title="Self-reported, not audited">
        These figures are entered by hand and are not connected to any bank,
        payment provider or accounting system. They are a working record for
        you — not evidence for a buyer, a lender or a tax authority, and not a
        forecast of anything.
      </Notice>
    </div>
  );
}
