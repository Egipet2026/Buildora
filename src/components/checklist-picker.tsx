"use client";

import { useActionState } from "react";
import { FormMessage } from "./dialog";
import { adoptChecklistAction } from "@/lib/workspace/actions";
import { IDLE } from "@/lib/action-state";
import { CHECKLISTS } from "@/lib/workspace/checklists";

/**
 * Starter checklists.
 *
 * Picking one appends its steps to the build plan, where they behave like any
 * other step — the template is a starting point, not a track the owner is
 * locked onto.
 */
export function ChecklistPicker() {
  const [state, action, pending] = useActionState(adoptChecklistAction, IDLE);

  return (
    <div className="card p-6 lg:p-8">
      <h2 className="display text-xl">Start from a checklist</h2>
      <p className="mt-2 max-w-2xl text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
        The steps almost every business of this kind has to work through. Add
        one and edit it into your own plan — nothing here is compulsory, and
        anything that depends on local law is written as something to check
        rather than something to do.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {CHECKLISTS.map((template) => (
          <form key={template.slug} action={action}>
            <input type="hidden" name="template" value={template.slug} />
            <button
              type="submit"
              disabled={pending}
              className="card card-hover flex w-full items-start gap-3.5 p-4 text-left disabled:opacity-60"
            >
              <span className="text-xl" aria-hidden>
                {template.icon}
              </span>
              <span className="min-w-0">
                <span className="block font-semibold">{template.name}</span>
                <span className="mt-0.5 block text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                  {template.blurb} · {template.steps.length} steps
                </span>
              </span>
            </button>
          </form>
        ))}
      </div>

      <div className="mt-4">
        <FormMessage state={state} />
      </div>
    </div>
  );
}
