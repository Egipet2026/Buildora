import Link from "next/link";
import { BusinessProfileForm } from "@/components/business-profile-form";
import { Notice, PageHeader } from "@/components/ui";
import { getCurrentUser } from "@/lib/data";

export const metadata = { title: "Create a business profile" };

export default async function NewBusinessProfilePage() {
  const me = await getCurrentUser();

  return (
    <>
      <PageHeader
        eyebrow="Business builder"
        title="Create your business profile"
        description="A profile is how other people on Bizora find you — as a partner, a client, a supplier or a buyer."
      />

      <div className="shell py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            {me ? (
              <BusinessProfileForm />
            ) : (
              <div className="card p-10 text-center">
                <h2 className="display text-xl">Sign in to publish a profile</h2>
                <div className="mt-6 flex justify-center gap-3">
                  <Link href="/login" className="btn btn-brand">
                    Sign in
                  </Link>
                  <Link href="/register" className="btn btn-outline">
                    Create account
                  </Link>
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="text-[0.9375rem] font-semibold">
                What a good profile does
              </h2>
              <ul className="mt-4 space-y-3">
                {[
                  "Says plainly what the business does and who it serves",
                  "Names the goal for the next 12 months",
                  "Is specific about what you need — “a backend engineer for a procurement tool” beats “developers”",
                  "Links to something real: a site, a product, a case study",
                ].map((tip) => (
                  <li key={tip} className="flex gap-2.5">
                    <span className="text-[var(--color-accent)]" aria-hidden>
                      ✓
                    </span>
                    <span className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
                      {tip}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            <Notice tone="gold" title="Looking for investors?">
              That option is not offered. Advertising an investment opportunity
              is a regulated activity in most jurisdictions, and Bizora will not
              host it until it can do so lawfully everywhere it operates. Use
              “Partners” for people who will work with you.
            </Notice>
          </aside>
        </div>
      </div>
    </>
  );
}
