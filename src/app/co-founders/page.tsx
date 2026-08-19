import Link from "next/link";
import { MessageMemberButton } from "@/components/message-member";
import { Cover, EmptyState, Notice, PageHeader } from "@/components/ui";
import {
  getCurrentUser,
  getFounderProfile,
  getFounderProfiles,
  getProfiles,
} from "@/lib/data";
import type { FounderProfile } from "@/lib/types";

export const metadata = {
  title: "Find a co-founder",
  description:
    "Founders looking for the person who covers what they cannot. Complementary skills, honest about time and what each side brings.",
};

/**
 * How well two founder profiles complement each other.
 *
 * Complementary, not similar: the score rises when one person's skills cover
 * what the other says they are missing. Two identical marketers are a worse
 * match than a marketer and an engineer, and this is the arithmetic that says
 * so.
 */
function complement(
  mine: FounderProfile,
  theirs: FounderProfile,
): { score: number; reasons: string[] } {
  const lower = (xs: string[]) => xs.map((x) => x.toLowerCase());
  const mySkills = new Set(lower(mine.skills));
  const theirSkills = new Set(lower(theirs.skills));
  const iSeek = lower(mine.seeking);
  const theySeek = lower(theirs.seeking);

  const reasons: string[] = [];
  let score = 20;

  const theyCover = iSeek.filter((want) =>
    [...theirSkills].some((s) => s.includes(want) || want.includes(s)),
  );
  if (theyCover.length) {
    score += Math.min(35, theyCover.length * 18);
    reasons.push(`They cover what you are missing — ${theyCover.join(", ")}`);
  }

  const iCover = theySeek.filter((want) =>
    [...mySkills].some((s) => s.includes(want) || want.includes(s)),
  );
  if (iCover.length) {
    score += Math.min(35, iCover.length * 18);
    reasons.push(`You cover what they are missing — ${iCover.join(", ")}`);
  }

  if (mine.industry.toLowerCase() === theirs.industry.toLowerCase()) {
    score += 10;
    reasons.push(`Both working in ${theirs.industry}`);
  }

  const overlap = [...mySkills].filter((s) => theirSkills.has(s));
  if (overlap.length > mySkills.size / 2) {
    score -= 15;
    reasons.push("Your skills overlap heavily, which may mean a gap elsewhere");
  }

  if (Math.abs(mine.hours_per_week - theirs.hours_per_week) <= 10) {
    score += 8;
    reasons.push("Similar time commitment");
  }

  return { score: Math.max(5, Math.min(97, score)), reasons };
}

export default async function CoFounderPage() {
  const me = await getCurrentUser();
  const [founders, profiles, mine] = await Promise.all([
    getFounderProfiles(),
    getProfiles(),
    me ? getFounderProfile(me.id) : Promise.resolve(null),
  ]);

  const byId = new Map(profiles.map((p) => [p.id, p]));
  const others = founders.filter((f) => f.is_open && f.user_id !== me?.id);

  const ranked = mine
    ? others
        .map((f) => ({ founder: f, ...complement(mine, f) }))
        .sort((a, b) => b.score - a.score)
    : others.map((f) => ({ founder: f, score: 0, reasons: [] as string[] }));

  return (
    <>
      <PageHeader
        eyebrow="Find a co-founder"
        title="The person who covers what you cannot"
        description="Not a list of people who do what you already do. Buildora ranks by complementary skills — what you are missing against what they bring, and the other way round."
      >
        <Link href="/co-founders/new" className="btn btn-primary">
          {mine ? "Edit my profile" : "Publish my profile"}
        </Link>
      </PageHeader>

      <div className="shell py-10">
        {!mine ? (
          <div className="mb-8">
            <Notice tone="brand" title="Publish a profile to see match scores">
              Matching works on what you are missing against what other people
              bring, so it needs your side of the equation. Until then this is
              just a list.
            </Notice>
          </div>
        ) : null}

        {ranked.length ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {ranked.map(({ founder, score, reasons }) => {
              const person = byId.get(founder.user_id);
              return (
                <article key={founder.id} className="card p-6 lg:p-7">
                  <div className="flex items-start gap-4">
                    <Cover
                      seed={founder.user_id}
                      label={person?.full_name ?? "Member"}
                      size="sm"
                      className="h-12 w-12 shrink-0 rounded-full"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold">
                            {person ? (
                              <Link
                                href={`/members/${person.id}`}
                                className="hover:text-[var(--color-brand)]"
                              >
                                {person.full_name}
                              </Link>
                            ) : (
                              "A member"
                            )}
                          </p>
                          <p className="text-[0.75rem] text-[var(--color-ink-3)]">
                            {founder.location} · {founder.industry} ·{" "}
                            {founder.hours_per_week}h a week
                          </p>
                        </div>
                        {mine ? (
                          <div className="shrink-0 text-right">
                            <p className="display text-xl leading-none text-[var(--color-brand)]">
                              {score}%
                            </p>
                            <p className="text-[0.625rem] uppercase tracking-wider text-[var(--color-ink-3)]">
                              complementary
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <h3 className="mt-4 text-[1.0625rem] font-semibold leading-snug">
                    {founder.headline}
                  </h3>

                  <dl className="mt-4 space-y-3 text-[0.875rem]">
                    <div>
                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                        Building
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-[var(--color-ink-2)]">
                        {founder.building}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[0.6875rem] font-semibold uppercase tracking-wider text-[var(--color-ink-3)]">
                        Brings
                      </dt>
                      <dd className="mt-0.5 leading-relaxed text-[var(--color-ink-2)]">
                        {founder.contributes}
                      </dd>
                    </div>
                  </dl>

                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {founder.skills.map((s) => (
                      <span key={s} className="badge">
                        {s}
                      </span>
                    ))}
                    {founder.seeking.map((s) => (
                      <span key={s} className="badge badge-brand">
                        needs {s}
                      </span>
                    ))}
                  </div>

                  {reasons.length ? (
                    <ul className="mt-4 space-y-1.5 border-t border-[var(--color-line)] pt-4">
                      {reasons.map((r) => (
                        <li
                          key={r}
                          className="flex gap-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]"
                        >
                          <span className="mt-[0.35rem] h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  <div className="mt-5">
                    {me && person && person.id !== me.id ? (
                      <MessageMemberButton
                        memberId={person.id}
                        memberName={person.full_name.split(" ")[0]}
                        label="Start a conversation"
                        className="btn btn-brand w-full"
                        placeholder={`Hello — I saw you are looking for a co-founder for ${founder.building.slice(0, 60)}…`}
                      />
                    ) : !me ? (
                      <Link href="/login" className="btn btn-brand w-full">
                        Sign in to get in touch
                      </Link>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon="🤝"
            title="No open profiles yet"
            description="Publish yours and it will be the first thing people see here."
            action={{ href: "/co-founders/new", label: "Publish my profile" }}
          />
        )}

        <div className="mt-10">
          <Notice tone="gold" title="Before you agree anything">
            A co-founder relationship is a legal and financial commitment.
            Agree equity, vesting, roles and what happens if one of you leaves
            in writing, and have it reviewed by a lawyer in your jurisdiction.
            Buildora introduces people; it does not paper the deal and takes no
            part in it.
          </Notice>
        </div>
      </div>
    </>
  );
}
