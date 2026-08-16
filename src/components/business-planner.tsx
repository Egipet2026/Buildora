"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field, Notice } from "./ui";
import { generateBusinessPlanAction } from "@/lib/actions";
import { adoptPlanStepsAction } from "@/lib/workspace/actions";
import { IDLE, type PlanState } from "@/lib/action-state";
import { COUNTRIES } from "@/lib/taxonomy";

const EXAMPLES = [
  "I want to build a food delivery business for office workers in Sofia.",
  "A SaaS that helps small clinics handle recurring compliance paperwork.",
  "A subscription box for speciality coffee sourced directly from farms.",
];

const PLAN_IDLE: PlanState = { ok: false };

export function BusinessPlanner() {
  const [state, action, pending] = useActionState(
    generateBusinessPlanAction,
    PLAN_IDLE,
  );
  const plan = state.plan;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <form action={action} className="card p-6 lg:p-8">
          <h2 className="display text-xl">What do you want to build?</h2>
          <p className="mt-2 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
            Describe it the way you would to a friend. One or two sentences is
            enough.
          </p>

          <div className="mt-6 space-y-5">
            <Field label="Your idea" htmlFor="idea" error={state.errors?.idea} required>
              <textarea
                id="idea"
                name="idea"
                className="textarea min-h-32"
                placeholder="I want to build a food delivery business…"
                required
              />
            </Field>

            <Field label="Where?" htmlFor="country">
              <select id="country" name="country" className="select">
                <option value="">Not sure yet</option>
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Starting budget"
              htmlFor="budget"
              hint="Optional — it changes what is realistic in the first months."
            >
              <input
                id="budget"
                name="budget"
                className="input"
                placeholder="e.g. €5,000"
              />
            </Field>

            <FormMessage state={state} />

            <SubmitButton pending={pending} className="btn btn-brand btn-lg w-full">
              Generate my plan
            </SubmitButton>
          </div>

          <div className="mt-6 hairline pt-5">
            <p className="mb-2.5 text-[0.75rem] font-semibold text-[var(--color-ink-3)]">
              Not sure how to describe it?
            </p>
            <ul className="space-y-2">
              {EXAMPLES.map((example) => (
                <li
                  key={example}
                  className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]"
                >
                  “{example}”
                </li>
              ))}
            </ul>
          </div>
        </form>
      </div>

      <div>
        {plan ? (
          <div className="space-y-5">
            <Notice tone="gold" title="This plan is indicative only">
              It is a structured starting point for your own research — not a
              financial forecast, not a guarantee of revenue, and not legal,
              tax, accounting or investment advice. Costs are rough orders of
              magnitude. Confirm anything that depends on local law with a
              qualified professional in your country.
              {plan.generated_offline ? (
                <span className="mt-2 block">
                  Generated from BizHub&apos;s built-in template — no model
                  provider is configured, so this plan is generic rather than
                  tailored to your wording.
                </span>
              ) : null}
            </Notice>

            <div className="card p-6 lg:p-8">
              <p className="eyebrow mb-2">Business idea</p>
              <p className="text-lg leading-relaxed">{plan.idea}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <PlanList title="Target customers" items={plan.target_customers} />
              <PlanList title="Required resources" items={plan.required_resources} />
              <PlanList title="Roles you'll need" items={plan.required_roles} />
              <PlanList title="Marketing ideas" items={plan.marketing_ideas} />
            </div>

            <div className="card p-6 lg:p-8">
              <p className="eyebrow mb-3">Business model</p>
              <p className="leading-relaxed text-[var(--color-ink-2)]">
                {plan.business_model}
              </p>
            </div>

            <div className="card p-6 lg:p-8">
              <p className="eyebrow mb-3">Revenue model</p>
              <p className="leading-relaxed text-[var(--color-ink-2)]">
                {plan.revenue_model}
              </p>
            </div>

            {/* Deliberately not a <table>: the shared table style carries a
                640px minimum, which on a phone turns two short columns into a
                sideways scroll. These rows wrap instead. */}
            <div className="card overflow-hidden">
              <div className="border-b border-[var(--color-line)] px-6 py-4 lg:px-8">
                <p className="eyebrow">Possible costs</p>
              </div>
              <dl className="divide-y divide-[var(--color-line)]">
                {plan.possible_costs.map((cost) => (
                  <div
                    key={cost.label}
                    className="px-6 py-3.5 sm:flex sm:items-baseline sm:justify-between sm:gap-6 lg:px-8"
                  >
                    <dt className="min-w-0 text-[0.875rem] font-medium text-[var(--color-ink)]">
                      {cost.label}
                    </dt>
                    <dd className="mt-0.5 text-[0.875rem] text-[var(--color-ink-2)] sm:mt-0 sm:shrink-0 sm:text-right">
                      {cost.estimate}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <AdoptSteps steps={plan.first_steps} />

            <div className="card bg-[var(--color-surface-2)] p-6 lg:p-8">
              <h3 className="display text-xl">Now find what you need</h3>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
                A plan is not a business. These are the parts of it you can
                source on BizHub today.
              </p>
              <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
                {[
                  { href: "/partners", label: "Find a business partner", icon: "🤝" },
                  { href: "/services", label: "Hire a specialist", icon: "👨‍💻" },
                  { href: "/patents", label: "License a technology", icon: "📜" },
                  { href: "/digital-assets", label: "Buy a site or SaaS", icon: "💻" },
                  { href: "/products", label: "Find a supplier", icon: "📦" },
                  { href: "/businesses", label: "Or just buy one", icon: "🏢" },
                ].map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="card card-hover flex items-center gap-3 p-4"
                  >
                    <span aria-hidden>{link.icon}</span>
                    <span className="text-[0.875rem] font-medium">
                      {link.label}
                    </span>
                  </Link>
                ))}
              </div>
              <Link
                href="/business-profiles/new"
                className="btn btn-primary mt-5 w-full"
              >
                Publish a business profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="card flex min-h-96 flex-col items-center justify-center p-10 text-center">
            <span className="text-3xl" aria-hidden>
              💡
            </span>
            <h2 className="display mt-4 text-xl">Your plan appears here</h2>
            <p className="mt-2 max-w-sm text-[0.875rem] leading-relaxed text-[var(--color-ink-3)]">
              Describe your idea and BizHub drafts an indicative plan: who your
              customers are, how the business could make money, what it might
              cost, who you need, and what to do in the first week.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * The generated first steps, with the option to keep them.
 *
 * Adopting turns each step into an ordinary milestone the member owns and can
 * edit or delete — the model drafts the checklist, it does not hold it.
 */
function AdoptSteps({ steps }: { steps: string[] }) {
  const [state, action, pending] = useActionState(adoptPlanStepsAction, IDLE);
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  if (!steps?.length) return null;

  return (
    <form action={action} className="card p-6 lg:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">First steps</p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
            Untick anything you disagree with, then keep the rest as a working
            checklist in your business.
          </p>
        </div>
      </div>

      <ol className="mt-5 space-y-3.5">
        {steps.map((step, i) => (
          <li key={step} className="flex items-start gap-3.5">
            <input
              type="checkbox"
              name="step"
              value={step}
              defaultChecked
              id={`step-${i}`}
              className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-brand)]"
            />
            <label
              htmlFor={`step-${i}`}
              className="leading-relaxed text-[var(--color-ink-2)]"
            >
              <span className="mr-2 font-semibold text-[var(--color-ink)]">
                {i + 1}.
              </span>
              {step}
            </label>
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-3">
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="btn btn-brand w-full">
          Add these steps to my build plan
        </SubmitButton>
        <p className="text-center text-[0.75rem] text-[var(--color-ink-3)]">
          No business set up yet?{" "}
          <Link href="/business-profiles/new" className="underline">
            Create one first
          </Link>{" "}
          — it takes a minute.
        </p>
      </div>
    </form>
  );
}

function PlanList({ title, items }: { title: string; items: string[] }) {
  if (!items?.length) return null;
  return (
    <div className="card p-6">
      <p className="eyebrow mb-3.5">{title}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[var(--color-ink-3)]" />
            <span className="text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
