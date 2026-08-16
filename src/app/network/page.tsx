import Link from "next/link";
import { PostComposer } from "@/components/ecosystem/forms";
import { Cover, EmptyState, Notice, PageHeader } from "@/components/ui";
import { toggleFollowAction } from "@/lib/ecosystem/actions";
import {
  getBusinessProfiles,
  getCurrentUser,
  getFollows,
  getPosts,
  getProfiles,
} from "@/lib/data";
import { timeAgo } from "@/lib/money";
import type { PostKind } from "@/lib/types";

export const metadata = {
  title: "Network",
  description:
    "Follow founders and businesses on Bizora and see what they are building, shipping and looking for.",
};

const KIND_LABEL: Record<PostKind, string> = {
  update: "Update",
  milestone: "Milestone",
  opportunity: "Opportunity",
};

export default async function NetworkPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const following = view === "following";

  const me = await getCurrentUser();
  const [posts, profiles, businesses, follows] = await Promise.all([
    getPosts(),
    getProfiles(),
    getBusinessProfiles(),
    me ? getFollows(me.id) : Promise.resolve([]),
  ]);

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const followedMembers = new Set(
    follows.filter((f) => f.target_type === "member").map((f) => f.target_id),
  );

  const shown = following
    ? posts.filter((p) => followedMembers.has(p.author_id))
    : posts;

  // People worth following: those who have posted, minus the ones you already do.
  const suggestions = profiles
    .filter(
      (p) =>
        p.id !== me?.id &&
        !p.is_blocked &&
        !followedMembers.has(p.id) &&
        posts.some((post) => post.author_id === p.id),
    )
    .slice(0, 4);

  return (
    <>
      <PageHeader
        eyebrow="Network"
        title="What people are building"
        description="A professional feed: what changed in a business, what someone shipped, what they need next. Not a place for anything else."
      >
        <Link href="/members" className="btn btn-outline">
          Browse members
        </Link>
      </PageHeader>

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0 space-y-6">
            {me ? <PostComposer /> : null}

            <div className="flex gap-2">
              {[
                { value: "all", label: "Everyone" },
                { value: "following", label: "People I follow" },
              ].map((tab) => (
                <Link
                  key={tab.value}
                  href={tab.value === "all" ? "/network" : "/network?view=following"}
                  aria-current={
                    (tab.value === "following") === following ? "page" : undefined
                  }
                  className={`rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                    (tab.value === "following") === following
                      ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                      : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-3)]"
                  }`}
                >
                  {tab.label}
                </Link>
              ))}
            </div>

            {shown.length ? (
              <div className="space-y-4">
                {shown.map((post) => {
                  const author = byId.get(post.author_id);
                  const business = businesses.find((b) => b.id === post.business_id);
                  return (
                    <article key={post.id} className="card p-5 lg:p-6">
                      <div className="flex items-start gap-3.5">
                        <Cover
                          seed={post.author_id}
                          label={author?.full_name ?? "Member"}
                          size="sm"
                          className="h-10 w-10 shrink-0 rounded-full"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                            <p className="font-semibold">
                              {author ? (
                                <Link
                                  href={`/members/${author.id}`}
                                  className="hover:text-[var(--color-brand)]"
                                >
                                  {author.full_name}
                                </Link>
                              ) : (
                                "A member"
                              )}
                            </p>
                            {business ? (
                              <span className="text-[0.8125rem] text-[var(--color-ink-3)]">
                                · {business.name}
                              </span>
                            ) : null}
                            <span className="badge">{KIND_LABEL[post.kind]}</span>
                            <span className="ml-auto text-[0.75rem] text-[var(--color-ink-3)]">
                              {timeAgo(post.created_at)}
                            </span>
                          </div>

                          <p className="mt-2.5 leading-relaxed text-[var(--color-ink-2)]">
                            {post.body}
                          </p>

                          <div className="mt-3.5 flex flex-wrap items-center gap-2">
                            {post.link ? (
                              <Link
                                href={post.link}
                                className="btn btn-outline btn-sm"
                              >
                                {post.link_label ?? "Open"}
                              </Link>
                            ) : null}
                            {me && author && author.id !== me.id ? (
                              <form action={toggleFollowAction}>
                                <input type="hidden" name="targetType" value="member" />
                                <input type="hidden" name="targetId" value={author.id} />
                                <button type="submit" className="btn btn-ghost btn-sm">
                                  {followedMembers.has(author.id)
                                    ? "Following"
                                    : "Follow"}
                                </button>
                              </form>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState
                icon="◎"
                title={following ? "You follow nobody yet" : "Nothing posted yet"}
                description={
                  following
                    ? "Follow a few founders and their updates appear here."
                    : "Be the first to share what you are working on."
                }
                action={{ href: "/network", label: "See everyone" }}
              />
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            {suggestions.length ? (
              <div className="card p-5">
                <p className="eyebrow mb-3">Worth following</p>
                <div className="space-y-3.5">
                  {suggestions.map((person) => (
                    <div key={person.id} className="flex items-center gap-3">
                      <Cover
                        seed={person.id}
                        label={person.full_name}
                        size="sm"
                        className="h-9 w-9 shrink-0 rounded-full"
                      />
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/members/${person.id}`}
                          className="block truncate text-[0.875rem] font-medium hover:text-[var(--color-brand)]"
                        >
                          {person.full_name}
                        </Link>
                        <p className="truncate text-[0.75rem] text-[var(--color-ink-3)]">
                          {person.headline ?? "Bizora member"}
                        </p>
                      </div>
                      {me ? (
                        <form action={toggleFollowAction}>
                          <input type="hidden" name="targetType" value="member" />
                          <input type="hidden" name="targetId" value={person.id} />
                          <button type="submit" className="btn btn-outline btn-sm shrink-0">
                            Follow
                          </button>
                        </form>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            <Notice tone="neutral" title="A professional feed">
              Posts here are about businesses — what changed, what shipped, what
              is needed. Anything else gets removed. Nothing you post is an
              offer, and nothing here has been checked by Bizora.
            </Notice>
          </aside>
        </div>
      </div>
    </>
  );
}
