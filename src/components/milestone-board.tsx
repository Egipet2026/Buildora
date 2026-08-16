"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import {
  addMilestoneAction,
  deleteMilestoneAction,
  toggleMilestoneAction,
} from "@/lib/workspace/actions";
import { IDLE } from "@/lib/action-state";
import type { BusinessMilestone, MilestoneStage } from "@/lib/types";

const STAGES: { key: MilestoneStage; label: string; blurb: string }[] = [
  {
    key: "validate",
    label: "Validate",
    blurb: "Prove someone will pay before you build the whole thing.",
  },
  {
    key: "set_up",
    label: "Set up",
    blurb: "Registration, banking, tools, the boring necessary parts.",
  },
  {
    key: "launch",
    label: "Launch",
    blurb: "Get the first real customers through the door.",
  },
  {
    key: "grow",
    label: "Grow",
    blurb: "Hire, expand, and make it repeatable.",
  },
];

/**
 * The build plan: a checklist the owner keeps, grouped by stage.
 *
 * Ticking a step posts to the server rather than holding local state, so the
 * plan is the same on every device and survives a reload.
 */
export function MilestoneBoard({
  milestones,
}: {
  milestones: BusinessMilestone[];
}) {
  const done = milestones.filter((m) => m.is_done).length;
  const progress = milestones.length
    ? Math.round((done / milestones.length) * 100)
    : 0;

  return (
    <div className="space-y-8">
      <div className="card p-6 lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="display text-xl">Your build plan</h2>
            <p className="mt-1.5 text-[0.875rem] text-[var(--color-ink-2)]">
              {milestones.length
                ? `${done} of ${milestones.length} steps done.`
                : "No steps yet — add the first one below."}
            </p>
          </div>
          <p className="display text-3xl">{progress}%</p>
        </div>
        <div
          className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-2)]"
          role="img"
          aria-label={`${progress}% complete`}
        >
          <div
            className="h-full rounded-full bg-[var(--color-accent)] transition-[width]"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {STAGES.map((stage) => {
          const items = milestones.filter((m) => m.stage === stage.key);
          return (
            <section key={stage.key} className="card p-6">
              <p className="eyebrow">{stage.label}</p>
              <p className="mt-1.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                {stage.blurb}
              </p>

              {items.length ? (
                <ul className="mt-4 space-y-3">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-start gap-3">
                      <form action={toggleMilestoneAction} className="pt-0.5">
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          aria-pressed={item.is_done}
                          aria-label={
                            item.is_done
                              ? `Mark “${item.title}” as not done`
                              : `Mark “${item.title}” as done`
                          }
                          className={`flex h-5 w-5 items-center justify-center rounded-md border text-[0.6875rem] transition-colors ${
                            item.is_done
                              ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white"
                              : "border-[var(--color-line-2)] hover:border-[var(--color-ink-3)]"
                          }`}
                        >
                          {item.is_done ? "✓" : ""}
                        </button>
                      </form>

                      <div className="min-w-0 flex-1">
                        <p
                          className={`text-[0.875rem] leading-relaxed ${
                            item.is_done
                              ? "text-[var(--color-ink-3)] line-through"
                              : "text-[var(--color-ink)]"
                          }`}
                        >
                          {item.title}
                        </p>
                        {item.detail ? (
                          <p className="mt-1 text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                            {item.detail}
                          </p>
                        ) : null}
                      </div>

                      <form
                        action={deleteMilestoneAction}
                        onSubmit={(e) => {
                          if (!confirm(`Remove “${item.title}” from your plan?`))
                            e.preventDefault();
                        }}
                      >
                        <input type="hidden" name="id" value={item.id} />
                        <button
                          type="submit"
                          aria-label={`Remove ${item.title}`}
                          className="rounded-md px-1.5 py-0.5 text-[var(--color-ink-3)] hover:bg-[var(--color-surface-2)] hover:text-[var(--color-danger)]"
                        >
                          ×
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-[0.8125rem] text-[var(--color-ink-3)]">
                  Nothing in this stage yet.
                </p>
              )}
            </section>
          );
        })}
      </div>

      <AddMilestone />
    </div>
  );
}

function AddMilestone() {
  const [state, action, pending] = useActionState(addMilestoneAction, IDLE);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  if (!open) {
    return (
      <button
        type="button"
        className="btn btn-outline w-full"
        onClick={() => setOpen(true)}
      >
        Add a step
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-6">
      <h3 className="display text-lg">Add a step</h3>

      <Field label="What needs doing?" htmlFor="ms-title" error={state.errors?.title} required>
        <input
          id="ms-title"
          name="title"
          className="input"
          placeholder="Interview 10 potential customers"
          required
        />
      </Field>

      <Field label="Notes" htmlFor="ms-detail" hint="Optional.">
        <textarea
          id="ms-detail"
          name="detail"
          className="textarea min-h-20"
          placeholder="Who, and what you want to learn."
        />
      </Field>

      <Field label="Stage" htmlFor="ms-stage">
        <select id="ms-stage" name="stage" className="select" defaultValue="validate">
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
      </Field>

      <FormMessage state={state} />

      <div className="flex gap-2.5">
        <SubmitButton pending={pending} className="btn btn-brand flex-1">
          Add step
        </SubmitButton>
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
