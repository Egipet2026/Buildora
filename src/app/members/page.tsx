import Link from "next/link";
import { Cover, EmptyState, PageHeader } from "@/components/ui";
import { getListings, getProfiles } from "@/lib/data";

export const metadata = {
  title: "Members",
  description:
    "Find founders, sellers, investors-ready businesses and specialists on BizHub, and message them directly.",
};

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim().toLowerCase();

  const [profiles, listings] = await Promise.all([
    getProfiles(),
    getListings({ limit: 1000 }),
  ]);

  const listingCount = new Map<string, number>();
  for (const listing of listings) {
    listingCount.set(listing.owner_id, (listingCount.get(listing.owner_id) ?? 0) + 1);
  }

  // Suspended accounts are not shown; there is nothing useful to do with them.
  const members = profiles
    .filter((p) => !p.is_blocked)
    .filter((p) =>
      query
        ? [p.full_name, p.headline ?? "", p.country ?? ""]
            .join(" ")
            .toLowerCase()
            .includes(query)
        : true,
    )
    .sort(
      (a, b) =>
        (listingCount.get(b.id) ?? 0) - (listingCount.get(a.id) ?? 0) ||
        a.full_name.localeCompare(b.full_name),
    );

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Members"
        description="The people behind the listings. Open a profile to see what they sell and message them directly — contact details stay private."
      />

      <div className="shell py-10">
        <form action="/members" className="mb-8 flex max-w-lg gap-2.5">
          <input
            type="search"
            name="q"
            defaultValue={q ?? ""}
            className="input"
            placeholder="Search by name, headline or country"
            aria-label="Search members"
          />
          <button type="submit" className="btn btn-brand shrink-0">
            Search
          </button>
        </form>

        {members.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <Link
                key={member.id}
                href={`/members/${member.id}`}
                className="card card-hover flex items-start gap-4 p-5"
              >
                <Cover
                  seed={member.id}
                  label={member.full_name}
                  size="sm"
                  className="h-12 w-12 shrink-0 rounded-full"
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {member.full_name}
                    {member.is_verified ? (
                      <span
                        className="ml-1.5 text-[var(--color-accent)]"
                        title="Verified member"
                      >
                        ✓
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 line-clamp-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                    {member.headline ?? "BizHub member"}
                  </p>
                  <p className="mt-2 text-[0.75rem] text-[var(--color-ink-3)]">
                    {member.country ?? "—"} ·{" "}
                    {listingCount.get(member.id) ?? 0} live{" "}
                    {(listingCount.get(member.id) ?? 0) === 1
                      ? "listing"
                      : "listings"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="⌕"
            title="No members match that search"
            description="Try a different name, or clear the search to see everyone."
            action={{ href: "/members", label: "Clear search" }}
          />
        )}
      </div>
    </>
  );
}
