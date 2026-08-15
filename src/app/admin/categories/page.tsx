import { Notice, SectionHead } from "@/components/ui";
import { getMarketplaceCounts } from "@/lib/data";
import { MARKETPLACES, REGULATED_SURFACES } from "@/lib/taxonomy";

export const metadata = { title: "Categories" };

export default async function AdminCategoriesPage() {
  const counts = await getMarketplaceCounts();

  return (
    <div className="space-y-8">
      <Notice tone="neutral" title="Where categories live">
        The taxonomy is defined in <code>src/lib/taxonomy.ts</code> and mirrored
        into the <code>categories</code> data at deploy time, so a category can
        never drift out of sync with the code that renders it. Editing this file
        adds a category everywhere it appears — navigation, filters, listing
        forms and search.
      </Notice>

      <div>
        <SectionHead title="Live marketplaces" />
        <div className="space-y-4">
          {MARKETPLACES.map((m) => (
            <div key={m.kind} className="card p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold">
                  <span aria-hidden>{m.icon}</span> {m.name}
                </h3>
                <span className="badge badge-neutral">
                  {counts[m.kind] ?? 0} active
                </span>
              </div>
              <p className="mt-1.5 text-[0.8125rem] text-[var(--color-ink-3)]">
                {m.tagline}
              </p>
              <div className="mt-3.5 flex flex-wrap gap-1.5">
                {m.categories.map((c) => (
                  <span key={c.slug} className="badge badge-neutral">
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <SectionHead
          title="Held back"
          description="Surfaces that stay disabled until the platform meets the requirements to operate them."
        />
        {REGULATED_SURFACES.map((s) => (
          <div key={s.slug} className="card border-dashed p-5">
            <h3 className="font-semibold">
              <span aria-hidden>{s.icon}</span> {s.name}
            </h3>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
              {s.note}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
