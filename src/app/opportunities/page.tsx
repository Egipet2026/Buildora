import Link from "next/link";
import { ListingGrid } from "@/components/listing-card";
import { EmptyState, Notice, PageHeader } from "@/components/ui";
import {
  getCurrentUser,
  getFavoriteIds,
  getFounderProfiles,
  getListings,
  getProfiles,
} from "@/lib/data";
import { timeAgo } from "@/lib/money";
import { MARKETPLACES } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";

export const metadata = {
  title: "Opportunities",
  description:
    "Everything newly available on Bizora in one feed — businesses for sale, patents, technologies, SaaS, websites, licences, services, suppliers, partners and co-founder requests.",
};

/** A window recent enough that the feed shows movement, not the back catalogue. */
const RECENT_DAYS = 45;

export default async function OpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string }>;
}) {
  const { kind } = await searchParams;
  const active = (kind ?? "all") as ListingKind | "all" | "cofounder";

  const me = await getCurrentUser();
  const [listings, savedIds, founders, profiles] = await Promise.all([
    getListings({ sort: "newest", limit: 200 }),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
    getFounderProfiles(),
    getProfiles(),
  ]);

  const cutoff = Date.now() - RECENT_DAYS * 86_400_000;
  const recent = listings.filter(
    (l) => new Date(l.published_at ?? l.created_at).getTime() >= cutoff,
  );
  // If the platform is quiet, showing an empty feed is worse than widening it.
  const pool = recent.length >= 6 ? recent : listings;

  const shown =
    active === "all" || active === "cofounder"
      ? pool
      : pool.filter((l) => l.kind === active);

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const openFounders = founders.filter((f) => f.is_open);

  const chips: { value: string; label: string }[] = [
    { value: "all", label: "Everything" },
    ...MARKETPLACES.map((m) => ({ value: m.kind, label: m.name })),
    { value: "cofounder", label: "Co-founder requests" },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Opportunities"
        title="What is newly available"
        description="One feed for everything that has just come onto Bizora — businesses, patents and technologies, SaaS and websites, licences, services, suppliers, partners and people looking for a co-founder."
      >
        <Link href="/dashboard/alerts" className="btn btn-outline">
          🔔 Alert me about these
        </Link>
        <Link href="/bizmatch" className="btn btn-primary">
          Match me instead
        </Link>
      </PageHeader>

      <div className="shell py-10">
        <div className="table-wrap -mx-1 mb-8">
          <div className="flex min-w-max gap-2 px-1">
            {chips.map((chip) => (
              <Link
                key={chip.value}
                href={
                  chip.value === "all"
                    ? "/opportunities"
                    : `/opportunities?kind=${chip.value}`
                }
                aria-current={active === chip.value ? "page" : undefined}
                className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[0.8125rem] font-medium transition-colors ${
                  active === chip.value
                    ? "border-[var(--color-ink)] bg-[var(--color-ink)] text-white"
                    : "border-[var(--color-line-2)] text-[var(--color-ink-2)] hover:border-[var(--color-ink-3)]"
                }`}
              >
                {chip.label}
              </Link>
            ))}
          </div>
        </div>

        {active === "cofounder" ? (
          openFounders.length ? (
            <div className="grid gap-4 md:grid-cols-2">
              {openFounders.map((founder) => {
                const person = byId.get(founder.user_id);
                return (
                  <article key={founder.id} className="card p-6">
                    <p className="eyebrow mb-2">
                      Co-founder wanted · {founder.industry}
                    </p>
                    <h3 className="text-[1.0625rem] font-semibold leading-snug">
                      {founder.headline}
                    </h3>
                    <p className="mt-2.5 line-clamp-3 leading-relaxed text-[var(--color-ink-2)]">
                      {founder.building}
                    </p>
                    <p className="mt-3 text-[0.75rem] text-[var(--color-ink-3)]">
                      {person?.full_name ?? "A member"} · {founder.location} ·{" "}
                      {founder.hours_per_week}h a week
                    </p>
                    <Link href="/co-founders" className="btn btn-outline btn-sm mt-4">
                      See the full profile
                    </Link>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="🤝"
              title="Nobody is looking for a co-founder right now"
              description="Publish your own profile and you will be the first."
              action={{ href: "/co-founders/new", label: "Publish a profile" }}
            />
          )
        ) : shown.length ? (
          <>
            <p className="mb-5 text-[0.8125rem] text-[var(--color-ink-3)]">
              {shown.length} {shown.length === 1 ? "opportunity" : "opportunities"}
              {recent.length >= 6
                ? `, newest first — the most recent arrived ${timeAgo(
                    shown[0].published_at ?? shown[0].created_at,
                  )}`
                : ", newest first"}
              .
            </p>
            <ListingGrid
              listings={shown}
              savedIds={savedIds}
              redirectTo="/opportunities"
              columns={3}
            />
          </>
        ) : (
          <EmptyState
            icon="⌕"
            title="Nothing new in this category"
            description="Try another category, or set an alert and Bizora will tell you the moment something appears."
            action={{ href: "/opportunities", label: "Show everything" }}
          />
        )}

        <div className="mt-10">
          <Notice tone="neutral">
            A place in this feed is not an endorsement. Listings appear here
            because they are new, not because Bizora rates them — every one
            still needs your own checks before you commit to anything.
          </Notice>
        </div>
      </div>
    </>
  );
}
