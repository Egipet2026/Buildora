import Link from "next/link";
import { Cover, EmptyState, PageHeader } from "@/components/ui";
import { getBusinessProfiles } from "@/lib/data";

export const metadata = {
  title: "Business Profiles",
  description:
    "Company profiles on Buildora — what they build, who is on the team, and what they are looking for.",
};

export default async function BusinessProfilesPage() {
  const profiles = await getBusinessProfiles();

  return (
    <>
      <PageHeader
        eyebrow="Business builder"
        title="Business profiles"
        description="Publish who you are and what you need — partners, developers, designers, suppliers or technology — and let the right people find you."
      >
        <Link href="/business-profiles/new" className="btn btn-brand">
          Create your profile
        </Link>
      </PageHeader>

      <div className="shell py-10">
        {profiles.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((b) => (
              <Link
                key={b.id}
                href={`/business-profiles/${b.slug}`}
                className="card card-hover flex flex-col overflow-hidden"
              >
                <Cover seed={b.id} label={b.name} className="h-24 w-full" />
                <div className="flex flex-1 flex-col p-5">
                  <p className="eyebrow mb-2">{b.industry}</p>
                  <h2 className="text-[1.0625rem] font-semibold leading-snug">
                    {b.name}
                  </h2>
                  <p className="mt-2 line-clamp-3 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                    {b.description}
                  </p>
                  {b.looking_for.length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {b.looking_for.map((item) => (
                        <span key={item} className="badge badge-brand">
                          {item}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <p className="mt-auto pt-4 text-[0.75rem] text-[var(--color-ink-3)]">
                    {b.country}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="🏢"
            title="No business profiles yet"
            description="Be the first to publish one — say what you build and what you need."
            action={{ href: "/business-profiles/new", label: "Create a profile" }}
          />
        )}
      </div>
    </>
  );
}
