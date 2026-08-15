import Link from "next/link";
import { SectionHead, Stat } from "@/components/ui";
import {
  getAdminStats,
  getListings,
  getReports,
  getVerificationRequests,
} from "@/lib/data";
import { formatMoney, formatNumber, timeAgo } from "@/lib/money";

export const metadata = { title: "Admin" };

export default async function AdminOverviewPage() {
  const [stats, pending, reports, verifications] = await Promise.all([
    getAdminStats(),
    getListings({ statuses: ["pending"], sort: "newest", limit: 5 }),
    getReports(),
    getVerificationRequests(),
  ]);

  const openReports = reports.filter(
    (r) => r.status === "open" || r.status === "reviewing",
  );
  const pendingVerifications = verifications.filter(
    (v) => v.status === "pending",
  );

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Members" value={formatNumber(stats.users)} />
        <Stat label="Active listings" value={formatNumber(stats.activeListings)} />
        <Stat
          label="Gross transaction value"
          value={formatMoney(stats.gmvCents)}
        />
        <Stat
          label="Platform fees"
          value={formatMoney(stats.feesCents)}
          tone="accent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat
          label="Awaiting moderation"
          value={stats.pendingListings}
          tone={stats.pendingListings ? "brand" : "default"}
        />
        <Stat
          label="Open reports"
          value={stats.openReports}
          tone={stats.openReports ? "danger" : "default"}
        />
        <Stat
          label="Verification queue"
          value={stats.pendingVerifications}
          tone={stats.pendingVerifications ? "brand" : "default"}
        />
        <Stat label="Blocked members" value={stats.blockedUsers} />
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHead
            title="Moderation queue"
            action={{ href: "/admin/listings", label: "Open queue" }}
          />
          {pending.length ? (
            <div className="card divide-y divide-[var(--color-line)]">
              {pending.map((l) => (
                <Link
                  key={l.id}
                  href="/admin/listings"
                  className="block p-4 transition-colors hover:bg-[var(--color-surface-2)]"
                >
                  <p className="font-medium">{l.title}</p>
                  <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                    {l.owner.full_name} · {timeAgo(l.created_at)}
                  </p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center text-[0.875rem] text-[var(--color-ink-3)]">
              Nothing waiting for review.
            </div>
          )}
        </div>

        <div>
          <SectionHead
            title="Needs attention"
            action={{ href: "/admin/reports", label: "All reports" }}
          />
          <div className="card divide-y divide-[var(--color-line)]">
            {openReports.slice(0, 3).map((r) => (
              <Link
                key={r.id}
                href="/admin/reports"
                className="block p-4 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <p className="font-medium">{r.reason}</p>
                <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                  {r.target_type} · {timeAgo(r.created_at)}
                </p>
              </Link>
            ))}
            {pendingVerifications.slice(0, 3).map((v) => (
              <Link
                key={v.id}
                href="/admin/verification"
                className="block p-4 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <p className="font-medium capitalize">
                  {v.kind} verification request
                </p>
                <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                  {timeAgo(v.created_at)}
                </p>
              </Link>
            ))}
            {!openReports.length && !pendingVerifications.length ? (
              <p className="p-8 text-center text-[0.875rem] text-[var(--color-ink-3)]">
                The queues are clear.
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
