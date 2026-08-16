import { VerificationForm } from "@/components/seller-tools";
import { Notice, SectionHead } from "@/components/ui";
import {
  getCurrentUser,
  getListings,
  getSettings,
  getVerificationRequests,
} from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata = { title: "Verification" };

const STATUS_BADGE: Record<string, string> = {
  pending: "badge-brand",
  verified: "badge-verified",
  rejected: "badge-danger",
  none: "badge-neutral",
};

export default async function VerificationPage() {
  const me = (await getCurrentUser())!;
  const [listings, requests, settings] = await Promise.all([
    getListings({
      ownerId: me.id,
      statuses: ["active", "pending", "draft"],
    }),
    getVerificationRequests(),
    getSettings(),
  ]);

  const mine = requests.filter((r) => r.user_id === me.id);

  return (
    <div className="space-y-10">
      <div className="card p-6 lg:p-8">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="max-w-xl">
            <p className="eyebrow mb-2">Your status</p>
            <div className="flex items-center gap-3">
              <span
                className={`badge ${STATUS_BADGE[me.verification_status] ?? "badge-neutral"}`}
              >
                {me.is_verified ? "Verified seller" : me.verification_status}
              </span>
            </div>
            <p className="mt-4 leading-relaxed text-[var(--color-ink-2)]">
              A Verified badge tells buyers that Bizora has checked specific
              facts you provided — who you are, that a company exists and you
              are connected to it, or that a patent number, jurisdiction, status
              and recorded holder match the public register.
            </p>
          </div>
          <VerificationForm
            listings={listings.map((l) => ({ id: l.id, title: l.title }))}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Verified Seller",
            body: "Identity and company checks on you as a person or business. Shows on your profile and every listing you publish.",
          },
          {
            title: "Verified Business",
            body: "Checks on a specific business listing: trading history evidence, domain ownership, and the documents behind the headline numbers.",
          },
          {
            title: "Verified Patent / Technology",
            body: "The number, jurisdiction, legal status and recorded proprietor checked against the public register, plus any assignment records.",
          },
        ].map((item) => (
          <div key={item.title} className="card p-6">
            <span className="badge badge-verified">✓ {item.title}</span>
            <p className="mt-3.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
              {item.body}
            </p>
          </div>
        ))}
      </div>

      <Notice tone="gold" title="What verification is not">
        Verification is a check on information, not an endorsement. It does not
        mean a business is profitable, that a patent is valid, enforceable or
        commercially useful, that a price is fair, or that a purchase will work
        out. It never removes your responsibility to do your own due diligence.
        The paid verification service costs{" "}
        {formatMoney(settings.verification_fee_cents)} and pays for the checks —
        not for a particular outcome. If the evidence does not support the
        claim, the request is rejected.
      </Notice>

      {mine.length ? (
        <div>
          <SectionHead title="Your requests" />
          <div className="card table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Submitted</th>
                  <th>Status</th>
                  <th>Reviewer notes</th>
                </tr>
              </thead>
              <tbody>
                {mine.map((r) => (
                  <tr key={r.id}>
                    <td className="font-medium capitalize text-[var(--color-ink)]">
                      {r.kind}
                    </td>
                    <td>{formatDate(r.created_at)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[r.status]}`}>
                        {r.status}
                      </span>
                    </td>
                    <td>{r.notes ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}
