"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field, Notice } from "./ui";
import {
  createListingAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { COUNTRIES, MARKETPLACES } from "@/lib/taxonomy";
import type { ListingKind } from "@/lib/types";

const DEAL_OPTIONS = [
  {
    value: "purchase",
    label: "Sell outright",
    hint: "Ownership transfers to the buyer.",
  },
  {
    value: "license_exclusive",
    label: "Exclusive licence",
    hint: "One licensee for a defined field or territory. You keep ownership.",
  },
  {
    value: "license_non_exclusive",
    label: "Non-exclusive licence",
    hint: "Licence to several parties at once. You keep ownership.",
  },
] as const;

function Fieldset({
  step,
  title,
  description,
  children,
}: {
  step: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="card p-6 lg:p-8">
      <legend className="sr-only">{title}</legend>
      <div className="mb-6 flex gap-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-ink)] text-[0.75rem] font-bold text-white">
          {step}
        </span>
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.015em]">{title}</h2>
          {description ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
              {description}
            </p>
          ) : null}
        </div>
      </div>
      <div className="space-y-5">{children}</div>
    </fieldset>
  );
}

export function ListingForm({ initialKind }: { initialKind?: ListingKind }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(createListingAction, IDLE);
  const [kind, setKind] = useState<ListingKind>(initialKind ?? "business");

  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const marketplace = MARKETPLACES.find((m) => m.kind === kind)!;
  const err = state.errors ?? {};

  const showFinancials = ["business", "digital_asset", "idea"].includes(kind);
  const showPatent = kind === "patent" || kind === "ai_tool";
  const showService = ["service", "marketing", "product"].includes(kind);
  const showPartner = kind === "partner";

  return (
    <form action={action} className="space-y-5">
      {/* ------------------------------------------------------- basics */}
      <Fieldset
        step={1}
        title="What are you listing?"
        description="Pick the marketplace it belongs in. This decides which details buyers see."
      >
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {MARKETPLACES.map((m) => (
            <label
              key={m.kind}
              className={`cursor-pointer rounded-xl border p-3.5 transition-colors ${
                kind === m.kind
                  ? "border-[var(--color-brand)] bg-[var(--color-brand-tint)]"
                  : "border-[var(--color-line-2)] hover:border-[var(--color-ink-3)]"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={m.kind}
                checked={kind === m.kind}
                onChange={() => setKind(m.kind)}
                className="sr-only"
              />
              <span className="block text-lg" aria-hidden>
                {m.icon}
              </span>
              <span className="mt-1.5 block text-[0.8125rem] font-semibold leading-snug">
                {m.name}
              </span>
            </label>
          ))}
        </div>

        <Field label="Category" htmlFor="category" error={err.category} required>
          <select id="category" name="category" className="select" required>
            <option value="">Choose a category…</option>
            {marketplace.categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label="Title"
          htmlFor="title"
          error={err.title}
          hint="Name it the way a buyer would search for it."
          required
        >
          <input
            id="title"
            name="title"
            className="input"
            maxLength={140}
            placeholder="e.g. Inboxly — B2B email deliverability SaaS"
            required
          />
        </Field>

        <Field
          label="One-line summary"
          htmlFor="summary"
          error={err.summary}
          hint="Shown on listing cards. Lead with the strongest fact."
          required
        >
          <input
            id="summary"
            name="summary"
            className="input"
            maxLength={220}
            placeholder="e.g. Bootstrapped SaaS with 412 paying teams and 94% gross margin."
            required
          />
        </Field>

        <Field
          label="Full description"
          htmlFor="description"
          error={err.description}
          hint="What it is, how it makes money, what a buyer is taking on, and what work it needs. Separate paragraphs with a blank line."
          required
        >
          <textarea
            id="description"
            name="description"
            className="textarea min-h-48"
            required
          />
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Country" htmlFor="country" error={err.country} required>
            <select id="country" name="country" className="select" required>
              <option value="">Choose…</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Asking price (€)"
            htmlFor="price"
            error={err.price}
            hint="Enter 0 to invite offers instead of naming a price."
          >
            <input
              id="price"
              name="price"
              className="input"
              inputMode="decimal"
              placeholder="0"
              defaultValue="0"
            />
          </Field>
        </div>
      </Fieldset>

      {/* ---------------------------------------------------- deal types */}
      <Fieldset
        step={2}
        title="How can buyers acquire it?"
        description="Choose every option you would consider. Buyers can make an offer against any of them."
      >
        <div className="space-y-2.5">
          {DEAL_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer gap-3 rounded-xl border border-[var(--color-line-2)] p-4 transition-colors hover:border-[var(--color-ink-3)]"
            >
              <input
                type="checkbox"
                name="dealTypes"
                value={opt.value}
                defaultChecked={opt.value === "purchase"}
                className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
              />
              <span>
                <span className="block text-[0.875rem] font-semibold">
                  {opt.label}
                </span>
                <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                  {opt.hint}
                </span>
              </span>
            </label>
          ))}
        </div>
        {err.dealTypes ? <p className="field-error">{err.dealTypes}</p> : null}

        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Licence fee (€)"
            htmlFor="licensePrice"
            hint="Leave blank if you are not licensing."
          >
            <input
              id="licensePrice"
              name="licensePrice"
              className="input"
              inputMode="decimal"
              placeholder="e.g. 2000"
            />
          </Field>
          <Field label="Licence period" htmlFor="licensePeriod">
            <select id="licensePeriod" name="licensePeriod" className="select">
              <option value="">—</option>
              <option value="year">per year</option>
              <option value="month">per month</option>
              <option value="one-time">one-time</option>
            </select>
          </Field>
        </div>
      </Fieldset>

      {/* ---------------------------------------------------- financials */}
      {showFinancials ? (
        <Fieldset
          step={3}
          title="Financials"
          description="Optional, but listings with numbers get materially more serious interest. Only enter figures you can evidence — you will be asked for source documents."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Annual revenue (€)" htmlFor="annualRevenue">
              <input
                id="annualRevenue"
                name="annualRevenue"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Monthly revenue (€)" htmlFor="monthlyRevenue">
              <input
                id="monthlyRevenue"
                name="monthlyRevenue"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Annual expenses (€)" htmlFor="annualExpenses">
              <input
                id="annualExpenses"
                name="annualExpenses"
                className="input"
                inputMode="decimal"
              />
            </Field>
            <Field label="Annual profit (€)" htmlFor="annualProfit">
              <input
                id="annualProfit"
                name="annualProfit"
                className="input"
                inputMode="decimal"
              />
            </Field>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Business model" htmlFor="businessModel">
              <input
                id="businessModel"
                name="businessModel"
                className="input"
                placeholder="e.g. Subscription (SaaS)"
              />
            </Field>
            <Field label="Year founded" htmlFor="yearFounded" error={err.yearFounded}>
              <input
                id="yearFounded"
                name="yearFounded"
                className="input"
                inputMode="numeric"
                placeholder="2021"
              />
            </Field>
          </div>

          <Field label="Online or offline?" htmlFor="isOnline">
            <select id="isOnline" name="isOnline" className="select">
              <option value="">Not specified</option>
              <option value="online">Online</option>
              <option value="offline">Offline / physical</option>
            </select>
          </Field>

          <Field label="Website" htmlFor="website" error={err.website}>
            <input
              id="website"
              name="website"
              className="input"
              placeholder="https://example.com"
            />
          </Field>

          <Field
            label="Social media"
            htmlFor="socials"
            hint="One URL per line."
          >
            <textarea
              id="socials"
              name="socials"
              className="textarea min-h-20"
              placeholder="https://linkedin.com/company/…"
            />
          </Field>
        </Fieldset>
      ) : null}

      {/* -------------------------------------------------------- patent */}
      {showPatent ? (
        <Fieldset
          step={3}
          title="Rights & technology"
          description="Buyers and licensees rely on these fields. A pending application must be described as pending — it will be labelled that way on the listing."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Patent / application number"
              htmlFor="patentNumber"
              hint="e.g. EP3421876B1"
            >
              <input id="patentNumber" name="patentNumber" className="input" />
            </Field>
            <Field label="Jurisdiction" htmlFor="jurisdiction">
              <input
                id="jurisdiction"
                name="jurisdiction"
                className="input"
                placeholder="e.g. European Patent Office (EP)"
              />
            </Field>
            <Field label="Legal status" htmlFor="patentStatus">
              <select id="patentStatus" name="patentStatus" className="select">
                <option value="">Choose…</option>
                <option value="Granted">Granted</option>
                <option value="Application pending">Application pending</option>
                <option value="Provisional filing">Provisional filing</option>
                <option value="Trade secret / unregistered">
                  Trade secret / unregistered
                </option>
                <option value="Expired">Expired</option>
              </select>
            </Field>
            <Field label="Registered rights holder" htmlFor="rightsHolder">
              <input id="rightsHolder" name="rightsHolder" className="input" />
            </Field>
            <Field label="Filing date" htmlFor="filingDate">
              <input
                id="filingDate"
                name="filingDate"
                className="input"
                type="date"
              />
            </Field>
            <Field label="Technology field" htmlFor="technologyField">
              <input
                id="technologyField"
                name="technologyField"
                className="input"
                placeholder="e.g. Membrane filtration"
              />
            </Field>
          </div>

          <Notice tone="gold" title="Publishing rules for IP listings">
            You may only list intellectual property you own or are authorised to
            offer. Do not describe an unexamined or pending application as a
            granted patent, and do not imply BizHub has assessed validity,
            enforceability or freedom to operate. Listings that misstate legal
            status are removed.
          </Notice>
        </Fieldset>
      ) : null}

      {/* ------------------------------------------------------- service */}
      {showService ? (
        <Fieldset
          step={3}
          title="Your expertise"
          description="What you do, how much experience you have, and how you charge."
        >
          <Field
            label="Skills"
            htmlFor="skills"
            hint="One per line, or comma-separated."
          >
            <textarea
              id="skills"
              name="skills"
              className="textarea min-h-24"
              placeholder="Next.js&#10;TypeScript&#10;Postgres"
            />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Years of experience" htmlFor="experienceYears">
              <input
                id="experienceYears"
                name="experienceYears"
                className="input"
                inputMode="numeric"
              />
            </Field>
            <Field
              label="Rate basis"
              htmlFor="rateUnit"
              hint="What the price above covers."
            >
              <input
                id="rateUnit"
                name="rateUnit"
                className="input"
                placeholder="hour / day / month / project"
              />
            </Field>
          </div>
          <Field label="Website or portfolio" htmlFor="website" error={err.website}>
            <input
              id="website"
              name="website"
              className="input"
              placeholder="https://example.com"
            />
          </Field>
        </Fieldset>
      ) : null}

      {/* ------------------------------------------------------- partner */}
      {showPartner ? (
        <Fieldset
          step={3}
          title="The partnership"
          description="Be explicit about money and time — it saves both sides weeks."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field
              label="Capital contribution expected (€)"
              htmlFor="investmentRequired"
              hint="Enter 0 if none is required."
            >
              <input
                id="investmentRequired"
                name="investmentRequired"
                className="input"
                inputMode="decimal"
                defaultValue="0"
              />
            </Field>
            <Field label="Remote or on-site" htmlFor="remote">
              <select id="remote" name="remote" className="select">
                <option value="">Not specified</option>
                <option value="remote">Remote</option>
                <option value="onsite">On-site</option>
              </select>
            </Field>
          </div>
          <Field label="Skills you're looking for" htmlFor="skills">
            <textarea
              id="skills"
              name="skills"
              className="textarea min-h-24"
              placeholder="Operations&#10;Hiring&#10;Fleet management"
            />
          </Field>
          <Notice tone="gold">
            A partner listing is a search for someone to work with. Do not use
            it to offer shares, securities or an investment return — that is a
            regulated activity and is not permitted on BizHub.
          </Notice>
        </Fieldset>
      ) : null}

      {/* --------------------------------------------------------- extras */}
      <Fieldset
        step={4}
        title="Sale details"
        description="The two questions every serious buyer asks first."
      >
        <Field label="Reason for selling" htmlFor="reasonForSelling">
          <textarea
            id="reasonForSelling"
            name="reasonForSelling"
            className="textarea min-h-24"
            placeholder="Buyers assume the worst when this is blank. A straight answer builds trust."
          />
        </Field>

        <Field
          label="What the buyer receives"
          htmlFor="assetsIncluded"
          hint="One item per line — code, domains, accounts, contracts, inventory, handover support."
        >
          <textarea
            id="assetsIncluded"
            name="assetsIncluded"
            className="textarea min-h-32"
            placeholder="Source code and repositories&#10;Customer base and subscriptions&#10;Domain and brand assets&#10;60 days of handover support"
          />
        </Field>

        <Notice tone="neutral" title="Images and documents">
          Image and document uploads run through Supabase Storage: images are
          public, documents are private and released to a buyer only when you
          choose. Configure a Supabase project to enable uploading; listings
          without images use a generated cover.
        </Notice>
      </Fieldset>

      {/* ------------------------------------------------------- confirm */}
      <Fieldset
        step={5}
        title="Confirm and submit"
        description="A moderator reviews every listing before it goes live. This usually takes less than one working day."
      >
        <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--color-line-2)] p-4">
          <input
            type="checkbox"
            name="rightsConfirmed"
            className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
            required
          />
          <span className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
            I confirm that I own, or am authorised to sell or license,
            everything in this listing; that the information I have given is
            accurate to the best of my knowledge; and that I will provide
            supporting evidence on request. I understand that BizHub does not
            guarantee a sale, does not endorse my listing, and may remove it if
            it breaches the{" "}
            <a href="/legal/marketplace-rules" className="underline">
              Marketplace Rules
            </a>
            .
          </span>
        </label>
        {err.rightsConfirmed ? (
          <p className="field-error">{err.rightsConfirmed}</p>
        ) : null}

        <FormMessage state={state} />

        <SubmitButton pending={pending} className="btn btn-brand btn-lg w-full">
          Submit for review
        </SubmitButton>
      </Fieldset>
    </form>
  );
}
