import Link from "next/link";
import { redirect } from "next/navigation";
import { ReviewForm } from "@/components/ecosystem/forms";
import { ReviewList } from "@/components/reputation";
import { Cover, EmptyState, Notice, SectionHead } from "@/components/ui";
import {
  getCurrentUser,
  getProfiles,
  getReviewableTransactions,
  getReviews,
} from "@/lib/data";
import { formatDate, formatMoney } from "@/lib/money";

export const metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [pending, all, profiles] = await Promise.all([
    getReviewableTransactions(me.id),
    getReviews(),
    getProfiles(),
  ]);

  const authors = new Map(profiles.map((p) => [p.id, p]));
  const written = all.filter((r) => r.author_id === me.id);
  const received = all.filter((r) => r.subject_id === me.id && !r.is_hidden);

  return (
    <div className="space-y-12">
      <div>
        <SectionHead
          title="Deals waiting for your review"
          description="A review can only be attached to a completed deal, and each deal takes one. That is what keeps this section honest."
        />

        {pending.length ? (
          <div className="space-y-4">
            {pending.map(({ transaction, counterparty, role }) => (
              <div key={transaction.id} className="card p-5 lg:p-6">
                <div className="flex flex-wrap items-start gap-4">
                  <Cover
                    seed={counterparty.id}
                    label={counterparty.full_name}
                    size="sm"
                    className="h-11 w-11 shrink-0 rounded-full"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold">
                      <Link
                        href={`/members/${counterparty.id}`}
                        className="hover:text-[var(--color-brand)]"
                      >
                        {counterparty.full_name}
                      </Link>
                    </p>
                    <p className="mt-0.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                      You were the {role} ·{" "}
                      {formatMoney(transaction.amount_cents)} ·{" "}
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>
                  <ReviewForm
                    transaction={transaction}
                    counterparty={counterparty}
                    role={role}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="✎"
            title="Nothing to review right now"
            description="When a deal completes, it appears here and you can review the other side."
          />
        )}
      </div>

      {received.length ? (
        <div>
          <SectionHead
            title="Reviews about you"
            description="Visible on your public profile and counted towards your Trust Score."
          />
          <ReviewList reviews={received} authors={authors} />
        </div>
      ) : null}

      {written.length ? (
        <div>
          <SectionHead title="Reviews you have written" />
          <ReviewList reviews={written} authors={authors} />
        </div>
      ) : null}

      <Notice tone="neutral" title="How Buildora keeps reviews honest">
        Every review points at a transaction recorded on the platform, both
        sides can review each other once, and reviews cannot be deleted by the
        person they are about — only hidden by a moderator, with the record
        kept. None of that makes a review true; it makes it costly to fake.
      </Notice>
    </div>
  );
}
