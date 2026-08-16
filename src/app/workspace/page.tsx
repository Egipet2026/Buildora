import Link from "next/link";
import { redirect } from "next/navigation";
import { EmptyState, Notice, SectionHead, Stat } from "@/components/ui";
import {
  getBusinessProducts,
  getConversationViews,
  getCurrentUser,
  getListings,
  getMilestones,
  getMyBusiness,
} from "@/lib/data";
import { formatMoney } from "@/lib/money";

export const metadata = { title: "My business" };

export default async function WorkspacePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);
  // The layout renders the set-up prompt in this case; nothing to show here.
  if (!business) return null;

  const [products, milestones, listings, conversations] = await Promise.all([
    getBusinessProducts(business.id, { includeDrafts: true }),
    getMilestones(business.id),
    getListings({ ownerId: me.id, statuses: ["active", "pending", "draft"] }),
    getConversationViews(me.id),
  ]);

  const published = products.filter((p) => p.status === "published");
  const drafts = products.filter((p) => p.status === "draft");
  const done = milestones.filter((m) => m.is_done).length;
  const progress = milestones.length
    ? Math.round((done / milestones.length) * 100)
    : 0;
  const unread = conversations.reduce((n, c) => n + c.unreadCount, 0);

  const priced = published.filter((p) => p.price_cents !== null);
  const cheapest = priced.length
    ? Math.min(...priced.map((p) => p.price_cents!))
    : null;

  const nextSteps = milestones.filter((m) => !m.is_done).slice(0, 3);

  return (
    <div className="space-y-12">
      <div className="grid grid-cols-2 gap-3.5 lg:grid-cols-4">
        <Stat label="Published products" value={published.length} tone="brand" />
        <Stat label="Drafts" value={drafts.length} />
        <Stat
          label="Build plan"
          value={`${progress}%`}
          hint={`${done} of ${milestones.length} done`}
        />
        <Stat label="Unread messages" value={unread} />
      </div>

      {/* --------------------------------------------------- what to do next */}
      <div className="grid gap-5 lg:grid-cols-2">
        <div className="card p-6 lg:p-8">
          <h2 className="display text-xl">Your storefront</h2>
          <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
            {published.length
              ? `${published.length} ${published.length === 1 ? "item is" : "items are"} live on your public page${
                  cheapest !== null ? `, from ${formatMoney(cheapest)}` : ""
                }. Buyers enquire through BizHub and you agree terms directly.`
              : "Nothing is live yet. Add what you sell — a product, a plan, a service — and it appears on your public page with a price and an enquiry button."}
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/workspace/products" className="btn btn-brand">
              {published.length ? "Manage products" : "Add your first product"}
            </Link>
            <Link
              href={`/business-profiles/${business.slug}`}
              className="btn btn-outline"
            >
              See it as a visitor
            </Link>
          </div>
        </div>

        <div className="card p-6 lg:p-8">
          <h2 className="display text-xl">Build plan</h2>
          {milestones.length ? (
            <>
              <div
                className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
                role="img"
                aria-label={`${progress}% of your build plan is complete`}
              >
                <div
                  className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <ul className="mt-5 space-y-2.5">
                {nextSteps.map((step) => (
                  <li
                    key={step.id}
                    className="flex gap-2.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-ink-3)]" />
                    {step.title}
                  </li>
                ))}
                {nextSteps.length === 0 ? (
                  <li className="text-[0.875rem] text-[var(--color-ink-2)]">
                    Every step is done. Add the next ones.
                  </li>
                ) : null}
              </ul>
            </>
          ) : (
            <p className="mt-2 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
              No steps yet. Write your own, or generate an indicative plan and
              keep the steps you agree with.
            </p>
          )}
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link href="/workspace/plan" className="btn btn-brand">
              Open the plan
            </Link>
            <Link href="/start-a-business" className="btn btn-outline">
              Generate steps with AI
            </Link>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------- your listings */}
      <div>
        <SectionHead
          title="Your marketplace listings"
          description="Selling the business, a patent, a service or a digital asset — these are separate from your storefront."
          action={{ href: "/seller/listings", label: "Manage listings" }}
        />
        {listings.length ? (
          <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
            {listings.slice(0, 5).map((listing) => (
              <Link
                key={listing.id}
                href={`/listing/${listing.id}`}
                className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{listing.title}</p>
                  <p className="mt-0.5 text-[0.75rem] text-[var(--color-ink-3)]">
                    {listing.status === "active"
                      ? "Live"
                      : listing.status === "pending"
                        ? "Awaiting moderation"
                        : "Draft"}
                  </p>
                </div>
                <span className="shrink-0 text-[0.875rem] text-[var(--color-ink-2)]">
                  {listing.price_cents
                    ? formatMoney(listing.price_cents, listing.currency)
                    : "Open to offers"}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="◻"
            title="No listings yet"
            description="A listing is for selling something on the marketplace — the business itself, a patent, a service or a digital asset."
            action={{ href: "/sell", label: "Post a listing" }}
          />
        )}
      </div>

      <Notice tone="neutral" title="What BizHub does and does not do here">
        Your storefront is a shop window and an enquiry channel. BizHub does not
        take payment for storefront products, does not ship anything, and does
        not guarantee your business to anyone who finds it. Prices, stock and
        claims on your page are yours — keep them accurate.
      </Notice>
    </div>
  );
}
