import Link from "next/link";
import { ReviewVerification } from "@/components/admin-actions";
import { EmptyState, Notice } from "@/components/ui";
import { getListing, getProfiles, getVerificationRequests } from "@/lib/data";
import { timeAgo } from "@/lib/money";

export const metadata = { title: "Verification queue" };

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-brand",
  verified: "badge-verified",
  rejected: "badge-danger",
  none: "badge-neutral",
};

export default async function AdminVerificationPage() {
  const [requests, profiles] = await Promise.all([
    getVerificationRequests(),
    getProfiles(),
  ]);

  if (!requests.length) {
    return (
      <EmptyState
        icon="✓"
        title="Verification queue is empty"
        description="Requests from sellers to verify their identity, a business listing or a patent appear here."
      />
    );
  }

  const rows = await Promise.all(
    requests.map(async (r) => ({
      request: r,
      user: profiles.find((p) => p.id === r.user_id),
      listing: r.listing_id ? await getListing(r.listing_id) : null,
    })),
  );

  return (
    <div className="space-y-5">
      <Notice tone="gold" title="Reviewer standard">
        Approve only what the evidence actually supports, and record what you
        checked and against which source. For patents, confirm the number,
        jurisdiction, legal status and recorded proprietor against the public
        register — never assess validity, enforceability or commercial value.
        Where Buildora cannot lawfully verify something, reject rather than assume.
      </Notice>

      {rows.map(({ request, user, listing }) => (
        <div key={request.id} className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`badge ${STATUS_BADGE[request.status]}`}>
                  {request.status}
                </span>
                <span className="badge badge-neutral capitalize">
                  {request.kind}
                </span>
                <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                  {timeAgo(request.created_at)}
                </span>
              </div>

              <p className="mt-3 font-semibold">
                {user?.full_name ?? "Unknown member"}
                {listing ? (
                  <>
                    {" · "}
                    <Link
                      href={`/listing/${listing.id}`}
                      className="font-normal text-[var(--color-brand)] hover:underline"
                    >
                      {listing.title}
                    </Link>
                  </>
                ) : null}
              </p>

              <dl className="mt-3 space-y-1.5">
                {request.evidence.map((e) => (
                  <div key={e.label} className="text-[0.875rem]">
                    <dt className="inline font-medium text-[var(--color-ink-2)]">
                      {e.label}:{" "}
                    </dt>
                    <dd className="inline text-[var(--color-ink-3)]">{e.value}</dd>
                  </div>
                ))}
              </dl>

              {request.notes ? (
                <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-3)]">
                  Notes: {request.notes}
                </p>
              ) : null}
            </div>

            {request.status === "pending" ? (
              <ReviewVerification requestId={request.id} />
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
