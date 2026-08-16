"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import { saveFounderProfileAction } from "@/lib/ecosystem/actions";
import { IDLE } from "@/lib/action-state";
import { COUNTRIES } from "@/lib/taxonomy";
import type { FounderProfile } from "@/lib/types";

export function FounderProfileForm({
  profile,
}: {
  profile: FounderProfile | null;
}) {
  const [state, action, pending] = useActionState(
    saveFounderProfileAction,
    IDLE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={action} className="card space-y-5 p-6 lg:p-8">
      <Field
        label="One line about what you want"
        htmlFor="headline"
        error={state.errors?.headline}
        required
      >
        <input
          id="headline"
          name="headline"
          className="input"
          defaultValue={profile?.headline ?? ""}
          placeholder="Growth marketer looking for a technical co-founder"
          required
        />
      </Field>

      <Field
        label="What you want to build"
        htmlFor="building"
        error={state.errors?.building}
        hint="One concrete sentence beats a paragraph of ambition."
        required
      >
        <textarea
          id="building"
          name="building"
          className="textarea min-h-24"
          defaultValue={profile?.building ?? ""}
          placeholder="A scheduling tool for clinics in markets where appointments are still booked by phone."
          required
        />
      </Field>

      <Field
        label="What you bring"
        htmlFor="contributes"
        error={state.errors?.contributes}
        required
      >
        <textarea
          id="contributes"
          name="contributes"
          className="textarea min-h-24"
          defaultValue={profile?.contributes ?? ""}
          placeholder="Demand: I can get the first hundred clinics through the door, and I will do the sales calls myself."
          required
        />
      </Field>

      <Field
        label="Your experience"
        htmlFor="experience"
        error={state.errors?.experience}
        required
      >
        <textarea
          id="experience"
          name="experience"
          className="textarea min-h-24"
          defaultValue={profile?.experience ?? ""}
          required
        />
      </Field>

      <Field
        label="Your skills"
        htmlFor="skills"
        hint="Comma separated. These are matched against what other people say they need."
      >
        <input
          id="skills"
          name="skills"
          className="input"
          defaultValue={profile?.skills.join(", ") ?? ""}
          placeholder="Marketing, SEO, Content, Analytics"
        />
      </Field>

      <Field
        label="What you need a co-founder to cover"
        htmlFor="seeking"
        hint="Comma separated. Be honest — this field does most of the matching."
      >
        <input
          id="seeking"
          name="seeking"
          className="input"
          defaultValue={profile?.seeking.join(", ") ?? ""}
          placeholder="Engineering, Product"
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Industry" htmlFor="industry" error={state.errors?.industry} required>
          <input
            id="industry"
            name="industry"
            className="input"
            defaultValue={profile?.industry ?? ""}
            placeholder="SaaS"
            required
          />
        </Field>

        <Field label="Where you are" htmlFor="location" error={state.errors?.location} required>
          <select
            id="location"
            name="location"
            className="select"
            defaultValue={profile?.location ?? ""}
            required
          >
            <option value="">Choose a country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Hours a week you can commit"
        htmlFor="hoursPerWeek"
        error={state.errors?.hoursPerWeek}
        hint="Say the real number. A mismatch here ends more partnerships than a skills gap."
        required
      >
        <input
          id="hoursPerWeek"
          name="hoursPerWeek"
          className="input"
          inputMode="numeric"
          defaultValue={profile?.hours_per_week ?? 20}
          required
        />
      </Field>

      <label className="flex items-center gap-2.5 text-[0.875rem]">
        <input type="hidden" name="isOpen" value="0" />
        <input
          type="checkbox"
          name="isOpen"
          value="1"
          defaultChecked={profile?.is_open ?? true}
          className="h-4 w-4 accent-[var(--color-brand)]"
        />
        Show my profile and let people contact me
      </label>

      <FormMessage state={state} />

      <SubmitButton pending={pending} className="btn btn-brand btn-lg w-full">
        {profile ? "Save profile" : "Publish profile"}
      </SubmitButton>
    </form>
  );
}
