"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import {
  createBusinessProfileAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { COUNTRIES } from "@/lib/taxonomy";

export const LOOKING_FOR = [
  "Partners",
  "Employees",
  "Developers",
  "Designers",
  "Suppliers",
  "Technology",
];

export function BusinessProfileForm() {
  const router = useRouter();
  const [state, action, pending] = useActionState(
    createBusinessProfileAction,
    IDLE,
  );

  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  const err = state.errors ?? {};

  return (
    <form action={action} className="card space-y-5 p-6 lg:p-8">
      <Field label="Business name" htmlFor="name" error={err.name} required>
        <input id="name" name="name" className="input" required />
      </Field>

      <Field
        label="What does it do?"
        htmlFor="description"
        error={err.description}
        hint="Two or three sentences. Say who it serves and what problem it solves."
        required
      >
        <textarea
          id="description"
          name="description"
          className="textarea min-h-32"
          required
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Industry" htmlFor="industry" error={err.industry} required>
          <input
            id="industry"
            name="industry"
            className="input"
            placeholder="e.g. Logistics software"
            required
          />
        </Field>
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
      </div>

      <Field label="Website" htmlFor="website" error={err.website}>
        <input
          id="website"
          name="website"
          className="input"
          placeholder="https://example.com"
        />
      </Field>

      <Field
        label="Products"
        htmlFor="products"
        hint="One per line."
      >
        <textarea id="products" name="products" className="textarea min-h-24" />
      </Field>

      <Field label="Services" htmlFor="services" hint="One per line.">
        <textarea id="services" name="services" className="textarea min-h-24" />
      </Field>

      <Field
        label="Team"
        htmlFor="team"
        hint="One per line as “Name — Role”."
      >
        <textarea
          id="team"
          name="team"
          className="textarea min-h-24"
          placeholder="Ana Petrova — Founder&#10;Ivan Georgiev — Engineering"
        />
      </Field>

      <Field
        label="Business goals"
        htmlFor="goals"
        hint="What you are trying to reach in the next 12 months."
      >
        <textarea id="goals" name="goals" className="textarea min-h-24" />
      </Field>

      <fieldset>
        <legend className="field-label">Looking for</legend>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {LOOKING_FOR.map((item) => (
            <label
              key={item}
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-[var(--color-line-2)] px-3.5 py-2.5 transition-colors hover:border-[var(--color-ink-3)]"
            >
              <input
                type="checkbox"
                name="lookingFor"
                value={item}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              <span className="text-[0.8125rem] font-medium">{item}</span>
            </label>
          ))}
        </div>
        <p className="field-hint">
          Investors are deliberately not an option here. Seeking investment is a
          regulated activity in most markets, and Bizora does not host it until
          it can do so lawfully in every market it serves.
        </p>
      </fieldset>

      <FormMessage state={state} />

      <SubmitButton pending={pending} className="btn btn-brand btn-lg w-full">
        Publish business profile
      </SubmitButton>
    </form>
  );
}
