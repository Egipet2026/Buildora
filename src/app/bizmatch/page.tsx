import Link from "next/link";
import { MatchCard } from "@/components/match-card";
import { EmptyState, Field, Notice, PageHeader } from "@/components/ui";
import { getListings } from "@/lib/data";
import { rankMatches, type MatchCriteria } from "@/lib/match/engine";
import { COUNTRIES, MARKETPLACES } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";

export const metadata = {
  title: "BizMatch",
  description:
    "Tell Bizora your budget, country, skills and interests and see which businesses, patents, technologies, services and partners fit — with the reasoning shown.",
};

type SP = Record<string, string | string[] | undefined>;

const one = (sp: SP, key: string): string => {
  const v = sp[key];
  return (Array.isArray(v) ? v[0] : v) ?? "";
};

const many = (sp: SP, key: string): string[] => {
  const v = sp[key];
  return Array.isArray(v) ? v : v ? [v] : [];
};

/** Euro text → cents, forgiving about spaces, commas and the symbol. */
function euros(raw: string): number | undefined {
  const clean = raw.replace(/[\s,€]/g, "");
  if (!clean || !/^\d+(\.\d{1,2})?$/.test(clean)) return undefined;
  return Math.round(parseFloat(clean) * 100);
}

const LOOKING_FOR: { kind: ListingKind; label: string }[] = MARKETPLACES.map(
  (m) => ({ kind: m.kind, label: m.name }),
);

export default async function BizMatchPage({
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;
  const submitted = Object.keys(sp).length > 0;

  const kinds = many(sp, "kind") as ListingKind[];
  const criteria: MatchCriteria = {
    budgetCents: euros(one(sp, "budget")),
    minBudgetCents: euros(one(sp, "minBudget")),
    country: one(sp, "country") || undefined,
    interests: one(sp, "interests") || undefined,
    skills: one(sp, "skills") || undefined,
    industry: one(sp, "industry") || undefined,
    online: (one(sp, "online") as "online" | "offline") || undefined,
    size: (one(sp, "size") as "small" | "medium" | "large") || undefined,
    kinds,
    verifiedOnly: one(sp, "verified") === "1",
  };

  const listings = submitted ? await getListings({ limit: 500 }) : [];
  const matches = submitted ? rankMatches(listings, criteria) : [];

  return (
    <>
      <PageHeader
        eyebrow="BizMatch"
        title="What fits you"
        description="Say what you can spend, where you are, what you know and what you want. Bizora ranks everything on the platform against it and shows you why each one scored what it did."
      />

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[320px_minmax(0,1fr)]">
          {/* ------------------------------------------------------- form */}
          <form
            action="/bizmatch"
            className="card h-fit space-y-5 p-6 lg:sticky lg:top-24"
          >
            <div>
              <h2 className="display text-lg">Your criteria</h2>
              <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                Everything is optional. The more you fill in, the sharper the
                ranking.
              </p>
            </div>

            <Field label="Budget (€)" htmlFor="budget" hint="The most you would spend.">
              <input
                id="budget"
                name="budget"
                className="input"
                inputMode="decimal"
                defaultValue={one(sp, "budget")}
                placeholder="20000"
              />
            </Field>

            <Field label="Country" htmlFor="country">
              <select
                id="country"
                name="country"
                className="select"
                defaultValue={one(sp, "country")}
              >
                <option value="">Anywhere</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="What interests you?"
              htmlFor="interests"
              hint="Plain words — “sustainable packaging”, “coffee”, “logistics”."
            >
              <textarea
                id="interests"
                name="interests"
                className="textarea min-h-20"
                defaultValue={one(sp, "interests")}
                placeholder="Eco products, subscription models, anything I can run from home."
              />
            </Field>

            <Field
              label="What can you already do?"
              htmlFor="skills"
              hint="Your skills weigh towards things you could actually run."
            >
              <textarea
                id="skills"
                name="skills"
                className="textarea min-h-20"
                defaultValue={one(sp, "skills")}
                placeholder="Marketing, some Python, ten years in retail."
              />
            </Field>

            <Field label="Preferred industry" htmlFor="industry">
              <input
                id="industry"
                name="industry"
                className="input"
                defaultValue={one(sp, "industry")}
                placeholder="SaaS, e-commerce, energy…"
              />
            </Field>

            <Field label="Online or offline" htmlFor="online">
              <select
                id="online"
                name="online"
                className="select"
                defaultValue={one(sp, "online")}
              >
                <option value="">Either</option>
                <option value="online">Online only</option>
                <option value="offline">With a physical presence</option>
              </select>
            </Field>

            <Field label="Size" htmlFor="size">
              <select
                id="size"
                name="size"
                className="select"
                defaultValue={one(sp, "size")}
              >
                <option value="">Any size</option>
                <option value="small">Small — under €100k revenue</option>
                <option value="medium">Medium — €100k to €1M</option>
                <option value="large">Large — over €1M</option>
              </select>
            </Field>

            <fieldset>
              <legend className="field-label">I am looking for</legend>
              <div className="space-y-2">
                {LOOKING_FOR.map((item) => (
                  <label
                    key={item.kind}
                    className="flex items-center gap-2.5 text-[0.8125rem]"
                  >
                    <input
                      type="checkbox"
                      name="kind"
                      value={item.kind}
                      defaultChecked={kinds.includes(item.kind)}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                    />
                    {item.label}
                  </label>
                ))}
              </div>
              <p className="mt-2 text-[0.75rem] text-[var(--color-ink-3)]">
                Leave all unticked to search everything.
              </p>
            </fieldset>

            <label className="flex items-center gap-2.5 text-[0.8125rem]">
              <input
                type="checkbox"
                name="verified"
                value="1"
                defaultChecked={one(sp, "verified") === "1"}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              Verified listings only
            </label>

            <button type="submit" className="btn btn-brand btn-lg w-full">
              Find my matches
            </button>

            {submitted ? (
              <Link href="/bizmatch" className="btn btn-ghost btn-sm w-full">
                Start again
              </Link>
            ) : null}
          </form>

          {/* ---------------------------------------------------- results */}
          <div className="min-w-0">
            {!submitted ? (
              <div className="card p-8 text-center lg:p-12">
                <span className="text-3xl" aria-hidden>
                  ◎
                </span>
                <h2 className="display mt-4 text-2xl">
                  Fill in what you know and press the button
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
                  BizMatch reads every listing on the platform — businesses,
                  patents, technologies, SaaS, services, partners and suppliers
                  — and ranks them against your answers, with the reasoning
                  attached to each result.
                </p>
              </div>
            ) : matches.length ? (
              <>
                <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
                  <p className="text-[0.875rem] text-[var(--color-ink-2)]">
                    <strong className="text-[var(--color-ink)]">
                      {matches.length}
                    </strong>{" "}
                    {matches.length === 1 ? "match" : "matches"}, best first.
                  </p>
                  <p className="text-[0.75rem] text-[var(--color-ink-3)]">
                    Anything scoring under 45% is left out.
                  </p>
                </div>

                <div className="space-y-4">
                  {matches.map((match) => (
                    <MatchCard key={match.listing.id} match={match} />
                  ))}
                </div>

                <div className="mt-8">
                  <Notice tone="gold" title="What the percentage means">
                    It measures how well a listing fits the criteria you typed —
                    budget, location, industry, wording, size. It says nothing
                    about whether the business is well run, whether its figures
                    are accurate, or whether buying it is a good idea. A 92%
                    match still needs the same due diligence as a 51% one.
                  </Notice>
                </div>
              </>
            ) : (
              <EmptyState
                icon="⌕"
                title="Nothing scored high enough"
                description="Try widening the budget, clearing the country, or ticking more marketplaces. Bizora would rather show you nothing than pad the page with things that do not fit."
                action={{ href: "/bizmatch", label: "Change the criteria" }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
