import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ListingGrid } from "@/components/listing-card";
import { Cover, KeyValue, Notice, SectionHead } from "@/components/ui";
import {
  getBusinessProfile,
  getCurrentUser,
  getFavoriteIds,
  getListings,
  getProfile,
} from "@/lib/data";
import { formatDate } from "@/lib/money";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const profile = await getBusinessProfile((await params).slug);
  if (!profile) return { title: "Profile not found" };
  return { title: profile.name, description: profile.description };
}

export default async function BusinessProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const profile = await getBusinessProfile(slug);
  if (!profile) notFound();

  const me = await getCurrentUser();
  const [owner, listings, savedIds] = await Promise.all([
    getProfile(profile.owner_id),
    getListings({ ownerId: profile.owner_id, limit: 3 }),
    me ? getFavoriteIds(me.id) : Promise.resolve([]),
  ]);

  return (
    <div className="bg-[var(--color-canvas)]">
      <div className="border-b border-[var(--color-line)] bg-[var(--color-surface)]">
        <Cover seed={profile.id} label={profile.name} className="h-40 w-full" size="lg" />
        <div className="shell py-8">
          <p className="eyebrow mb-2">{profile.industry}</p>
          <h1 className="display text-3xl lg:text-[2.5rem]">{profile.name}</h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-ink-2)]">
            {profile.description}
          </p>

          {profile.looking_for.length ? (
            <div className="mt-6">
              <p className="eyebrow mb-2.5">Looking for</p>
              <div className="flex flex-wrap gap-2">
                {profile.looking_for.map((item) => (
                  <span key={item} className="badge badge-brand">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-6">
            {profile.goals ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-3 text-xl">Business goals</h2>
                <p className="leading-relaxed text-[var(--color-ink-2)]">
                  {profile.goals}
                </p>
              </div>
            ) : null}

            {profile.products.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Products</h2>
                <ul className="space-y-2.5">
                  {profile.products.map((p) => (
                    <li key={p} className="flex gap-3">
                      <span className="text-[var(--color-accent)]" aria-hidden>
                        ▪
                      </span>
                      <span className="text-[0.9375rem] text-[var(--color-ink-2)]">
                        {p}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.services.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Services</h2>
                <ul className="space-y-2.5">
                  {profile.services.map((s) => (
                    <li key={s} className="flex gap-3">
                      <span className="text-[var(--color-accent)]" aria-hidden>
                        ▪
                      </span>
                      <span className="text-[0.9375rem] text-[var(--color-ink-2)]">
                        {s}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {profile.team.length ? (
              <div className="card p-6 lg:p-8">
                <h2 className="display mb-4 text-xl">Team</h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {profile.team.map((member) => (
                    <div key={member.name} className="flex items-center gap-3">
                      <Cover
                        seed={member.name}
                        label={member.name}
                        size="sm"
                        className="h-10 w-10 shrink-0 rounded-full"
                      />
                      <div className="min-w-0">
                        <p className="truncate font-medium">{member.name}</p>
                        <p className="truncate text-[0.8125rem] text-[var(--color-ink-3)]">
                          {member.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card px-6 py-2">
              <dl>
                <KeyValue label="Industry" value={profile.industry} />
                <KeyValue label="Country" value={profile.country} />
                <KeyValue
                  label="Website"
                  value={
                    profile.website ? (
                      <a
                        href={profile.website}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="text-[var(--color-brand)] hover:underline"
                      >
                        {profile.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : null
                  }
                />
                <KeyValue label="Published" value={formatDate(profile.created_at)} />
                <KeyValue label="Owner" value={owner?.full_name ?? null} />
              </dl>
            </div>

            <div className="card p-6">
              <p className="eyebrow mb-3">Get in touch</p>
              <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                Reach this business through one of their listings so the
                conversation stays on the platform and both sides keep a record.
              </p>
              <Link href="/marketplace" className="btn btn-outline mt-4 w-full">
                Browse their listings
              </Link>
            </div>

            <Notice tone="neutral">
              Business profiles are self-published. BizHub does not verify the
              claims in them unless the business is separately verified.
            </Notice>
          </aside>
        </div>

        {listings.length ? (
          <div className="mt-16">
            <SectionHead title={`Listings from ${profile.name}`} />
            <ListingGrid
              listings={listings}
              savedIds={savedIds}
              redirectTo={`/business-profiles/${profile.slug}`}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
