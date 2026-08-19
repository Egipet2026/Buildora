"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field, Notice } from "./ui";
import { generateResearchAction } from "@/lib/actions";
import type { ResearchState } from "@/lib/action-state";
import { COUNTRIES } from "@/lib/taxonomy";
import { AiFallbackNotice } from "./ai-fallback-notice";

const RESEARCH_IDLE: ResearchState = { ok: false };

export function MarketResearchTool() {
  const [state, action, pending] = useActionState(
    generateResearchAction,
    RESEARCH_IDLE,
  );
  const research = state.research;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,400px)_minmax(0,1fr)]">
      <div className="lg:sticky lg:top-24 lg:self-start">
        <form action={action} className="card space-y-5 p-6 lg:p-8">
          <div>
            <h2 className="display text-xl">What market?</h2>
            <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
              The more precisely you describe it, the less generic the answer.
            </p>
          </div>

          <Field label="Industry" htmlFor="r-industry" error={state.errors?.industry} required>
            <input
              id="r-industry"
              name="industry"
              className="input"
              placeholder="Speciality coffee roasting"
              required
            />
          </Field>

          <Field label="Country or market" htmlFor="r-country">
            <select id="r-country" name="country" className="select" defaultValue="">
              <option value="">Not specific</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Target customer" htmlFor="r-customer">
            <input
              id="r-customer"
              name="customer"
              className="input"
              placeholder="Offices with 20–100 staff"
            />
          </Field>

          <Field label="Product or service" htmlFor="r-product">
            <input
              id="r-product"
              name="product"
              className="input"
              placeholder="Weekly bean subscription with grinder servicing"
            />
          </Field>

          <FormMessage state={state} />

          <SubmitButton pending={pending} className="btn btn-brand btn-lg w-full">
            Generate an overview
          </SubmitButton>
        </form>
      </div>

      <div>
        {research ? (
          <div className="space-y-5">
            {research.generated_offline ? (
              <AiFallbackNotice
                reason={research.offline_reason}
                what="research"
              />
            ) : null}

            <Notice tone="gold" title="This is not market data">
              Buildora has no market database and cannot look anything up. What
              follows is a model&apos;s qualitative summary of how this kind of
              market tends to work — it contains no verified figures, may be out
              of date, and must not be quoted as research. Treat it as a list of
              things to go and check.
            </Notice>

            <div className="card p-6 lg:p-8">
              <p className="eyebrow mb-2">
                {research.industry}
                {research.country ? ` · ${research.country}` : ""}
              </p>
              <h2 className="display mb-3 text-xl">How this market works</h2>
              <p className="leading-relaxed text-[var(--color-ink-2)]">
                {research.overview}
              </p>
            </div>

            <div className="card p-6 lg:p-8">
              <h2 className="display mb-4 text-xl">Who you would be up against</h2>
              <dl className="space-y-4">
                {research.competitors.map((c) => (
                  <div key={c.name}>
                    <dt className="font-semibold">{c.name}</dt>
                    <dd className="mt-0.5 leading-relaxed text-[var(--color-ink-2)]">
                      {c.note}
                    </dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <ResearchList title="Target audience" items={research.target_audience} />
              <ResearchList title="Opportunities" items={research.opportunities} />
              <ResearchList title="Risks" items={research.risks} tone="gold" />
              <ResearchList
                title="Ways to be different"
                items={research.differentiation}
              />
            </div>
          </div>
        ) : (
          <div className="card p-8 text-center lg:p-12">
            <span className="text-3xl" aria-hidden>
              ⌕
            </span>
            <h2 className="display mt-4 text-2xl">
              Describe the market and press the button
            </h2>
            <p className="mx-auto mt-3 max-w-md leading-relaxed text-[var(--color-ink-2)]">
              You get a structured overview of how the market works, who else is
              in it, who buys, what could go wrong and where a new entrant could
              be genuinely different — as a starting point for your own
              research, not a substitute for it.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ResearchList({
  title,
  items,
  tone = "accent",
}: {
  title: string;
  items: string[];
  tone?: "accent" | "gold";
}) {
  if (!items?.length) return null;
  return (
    <div className="card p-6">
      <p className="eyebrow mb-3.5">{title}</p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span
              className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${
                tone === "gold"
                  ? "bg-[var(--color-gold)]"
                  : "bg-[var(--color-accent)]"
              }`}
            />
            <span className="text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
              {item}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
