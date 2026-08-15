import Link from "next/link";
import { ResolveReport } from "@/components/admin-actions";
import { EmptyState } from "@/components/ui";
import { getListing, getProfiles, getReports } from "@/lib/data";
import { timeAgo } from "@/lib/money";

export const metadata = { title: "Reports" };

const STATUS_BADGE: Record<string, string> = {
  open: "badge-danger",
  reviewing: "badge-brand",
  resolved: "badge-verified",
  dismissed: "badge-neutral",
};

export default async function AdminReportsPage() {
  const [reports, profiles] = await Promise.all([getReports(), getProfiles()]);

  if (!reports.length) {
    return (
      <EmptyState
        icon="✓"
        title="No reports"
        description="Reports raised by members about listings, users or messages appear here."
      />
    );
  }

  const rows = await Promise.all(
    reports.map(async (r) => ({
      report: r,
      reporter: profiles.find((p) => p.id === r.reporter_id),
      listing:
        r.target_type === "listing" ? await getListing(r.target_id) : null,
      user:
        r.target_type === "user"
          ? profiles.find((p) => p.id === r.target_id)
          : null,
    })),
  );

  return (
    <div className="space-y-4">
      {rows.map(({ report, reporter, listing, user }) => (
        <div key={report.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${STATUS_BADGE[report.status]}`}>
                  {report.status}
                </span>
                <span className="badge badge-neutral capitalize">
                  {report.target_type}
                </span>
                <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                  {timeAgo(report.created_at)}
                </span>
              </div>

              <p className="mt-3 font-semibold">{report.reason}</p>
              {report.details ? (
                <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
                  {report.details}
                </p>
              ) : null}

              <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-3)]">
                Reported by {reporter?.full_name ?? "a member"} ·{" "}
                {listing ? (
                  <Link
                    href={`/listing/${listing.id}`}
                    className="text-[var(--color-brand)] hover:underline"
                  >
                    {listing.title}
                  </Link>
                ) : user ? (
                  <span>{user.full_name}</span>
                ) : (
                  <span>Target: {report.target_id}</span>
                )}
              </p>
            </div>

            <ResolveReport reportId={report.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
