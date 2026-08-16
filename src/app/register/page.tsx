import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthFlow } from "@/components/auth-flow";
import { PageHeader } from "@/components/ui";
import { hasExplicitSession } from "@/lib/data";

export const metadata = { title: "Create an account" };

const STEPS = [
  {
    title: "Your details",
    body: "Sign up with an email address or a phone number, plus a password.",
  },
  {
    title: "Confirm it's you",
    body: "We send a 6-digit code to that address or number. Enter it to prove you own it.",
  },
  {
    title: "You're in",
    body: "Save listings, message sellers, make offers, and list your own business.",
  },
];

export default async function RegisterPage() {
  if (await hasExplicitSession()) redirect("/dashboard");

  return (
    <>
      <PageHeader
        eyebrow="Join BizHub"
        title="Create your account"
        description="Free to join. Sign up with an email address or a phone number — whichever you actually check."
      />

      <div className="shell py-12">
        <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
          <div className="min-w-0">
            <AuthFlow mode="register" />
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="card p-6">
              <h2 className="text-[0.9375rem] font-semibold">Three steps</h2>
              <ol className="mt-4 space-y-4">
                {STEPS.map((step, i) => (
                  <li key={step.title} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[0.6875rem] font-bold text-white">
                      {i + 1}
                    </span>
                    <span>
                      <span className="block text-[0.875rem] font-semibold">
                        {step.title}
                      </span>
                      <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <p className="mt-5 text-center text-[0.8125rem] text-[var(--color-ink-3)]">
              <Link href="/" className="hover:text-[var(--color-ink)]">
                ← Back to the marketplace
              </Link>
            </p>
          </aside>
        </div>
      </div>
    </>
  );
}
