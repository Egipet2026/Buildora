import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingGrid } from "@/components/listing-card";
import { ReportButton } from "@/components/listing-actions";
import { MessageMemberButton } from "@/components/message-member";
import { Cover, EmptyState, Notice, SectionHead } from "@/components/ui";
import {
  getCurrentUser,
  getFavoriteIds,
  getListings,
  getMyBusiness,
  getProfile,
} from "@/lib/data";
import { formatDate } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const profile = await getProfile((await params).id);
  if (!profile) return { title: "Member not found" };
  return {
    title: profile.full_name,
    description: profile.headline ?? `${profile.full_name} on BizHub`,
  };
}

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const member = await getProfile(id);
  if (!member) notFound();

  const me = await getCurrentUser();
  const isMe = me?.id === member.id;

  const [business, listings, savedIds] = await Promise.all([
    getMyBusiness(member.id),
    getListings({ ownerId: member.id, limit: 12 }),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
  ]);

  return (
    <div className="bg-[var(--color-canvas)]">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <div className="shell py-10">
          <div className="flex flex-wrap items-start gap-6">
            <Cover
              seed={member.id}
              label={member.full_name}
              size="lg"
              className="h-20 w-20 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <h1 className="display text-3xl">
                {member.full_name}
                {member.is_verified ? (
                  <span
                    className="ml-2 align-middle text-[var(--color-accent)]"
                    title="Verified member"
                  >
                    ✓
                  </span>
                ) : null}
              </h1>
              {member.headline ? (
                <p className="mt-1.5 text-[0.9375rem] text-[var(--color-ink-2)]">
                  {member.headline}
                </p>
              ) : null}
              <p className="mt-3 text-[0.8125rem] text-[var(--color-ink-3)]">
                {member.country ? `${member.country} · ` : ""}Member since{" "}
                {formatDate(member.created_at)}
                {member.premium_tier !== "free"
                  ? ` · ${member.premium_tier === "premium" ? "Premium" : "Business"} seller`
                  : ""}
              </p>
            </div>

            <div className="w-full sm:w-56">
              {isMe ? (
                <Link href="/dashboard" className="btn btn-outline w-full">
                  This is you — open your profile
                </Link>
              ) : me ? (
                <MessageMemberButton
                  memberId={member.id}
                  memberName={member.full_name.split(" ")[0]}
                />
              ) : (
                <Link href="/login" className="btn btn-brand w-full">
                  Sign in to message
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            {member.bio ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-3 text-xl">About</h2>
                <p className="leading-relaxed text-[var(--color-ink-2)]">
                  {member.bio}
                </p>
              </div>
            ) : null}

            <div>
              <SectionHead
                title={`Listings by ${member.full_name.split(" ")[0]}`}
                description="Only published listings appear here."
              />
              {listings.length ? (
                <ListingGrid
                  listings={listings}
                  savedIds={savedIds}
                  redirectTo={`/members/${member.id}`}
                  columns={2}
                />
              ) : (
                <EmptyState
                  icon="◻"
                  title="Nothing listed right now"
                  description="This member has no live listings at the moment."
                />
              )}
            </div>
          </div>

          <aside className="space-y-5">
            {business ? (
              <div className="card overflow-hidden">
                <Cover
                  seed={business.id}
                  label={business.name}
                  className="h-24 w-full"
                />
                <div className="p-5">
                  <p className="eyebrow mb-2">Runs a business</p>
                  <Link
                    href={`/business-profiles/${business.slug}`}
                    className="font-semibold leading-snug hover:text-[var(--color-brand)]"
                  >
                    {business.name}
                  </Link>
                  <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                    {business.industry} · {business.country}
                  </p>
                  <Link
                    href={`/business-profiles/${business.slug}`}
                    className="btn btn-outline btn-sm mt-4 w-full"
                  >
                    Visit the storefront
                  </Link>
                </div>
              </div>
            ) : null}

            <div className="card p-5">
              <p className="eyebrow mb-3">Member</p>
              <dl className="space-y-2 text-[0.8125rem]">
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-3)]">Country</dt>
                  <dd>{member.country ?? "—"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-3)]">Member since</dt>
                  <dd>{formatDate(member.created_at)}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-3)]">Verified</dt>
                  <dd>{member.is_verified ? "Yes" : "Not yet"}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-[var(--color-ink-3)]">Live listings</dt>
                  <dd>{listings.length}</dd>
                </div>
              </dl>
              {!isMe ? (
                <div className="mt-4 hairline pt-4">
                  <ReportButton
                    targetType="user"
                    targetId={member.id}
                    label="Report this member"
                  />
                </div>
              ) : null}
            </div>

            <Notice tone="neutral" title="What a badge means">
              A Verified badge confirms details this member evidenced to BizHub.
              It is not an audit, a credit check, or an opinion on whether they
              are worth dealing with. Do your own checks before you commit.
            </Notice>
          </aside>
        </div>
      </div>
    </div>
  );
}
