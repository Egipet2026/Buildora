import Link from "next/link";
import { redirect } from "next/navigation";
import { FounderProfileForm } from "@/components/founder-form";
import { Notice, PageHeader } from "@/components/ui";
import { getCurrentUser, getFounderProfile } from "@/lib/data";

export const metadata = { title: "Co-founder profile" };

export default async function FounderProfilePage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const existing = await getFounderProfile(me.id);

  return (
    <>
      <PageHeader
        eyebrow="Find a co-founder"
        title={existing ? "Your co-founder profile" : "Publish your profile"}
        description="Be specific about what you are missing. That is the field the matching actually runs on — vague answers get vague matches."
      />

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <FounderProfileForm profile={existing} />
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <Notice tone="brand" title="What makes a good profile">
              Say what you are building in one concrete sentence, what you can
              personally deliver, and what you genuinely cannot. “I can get the
              first hundred customers, I cannot build the product” is worth more
              than a list of adjectives.
            </Notice>

            <Notice tone="gold" title="Be careful what you publish">
              This page is public. Do not put anything confidential here — an
              unfiled invention, a client list, financials you have not agreed
              to share. Talk about those privately once you know who you are
              talking to.
            </Notice>

            <div className="card p-6">
              <p className="eyebrow mb-2">Already looking?</p>
              <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                You can also list a formal partnership opportunity on the
                marketplace, where it gets offers and a negotiation history.
              </p>
              <Link href="/partners" className="btn btn-outline btn-sm mt-4 w-full">
                Business partners marketplace
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}
