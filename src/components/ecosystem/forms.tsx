"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { FormMessage, SubmitButton } from "../dialog";
import { Field } from "../ui";
import {
  createAlertAction,
  createPostAction,
  saveGoalAction,
  saveMetricAction,
  writeReviewAction,
} from "@/lib/ecosystem/actions";
import { IDLE } from "@/lib/action-state";
import { COUNTRIES, MARKETPLACES } from "@/lib/taxonomy";
import type { BusinessGoal, Profile, Transaction } from "@/lib/types";

/**
 * Dashboard-side forms for the ecosystem modules.
 *
 * They share one file because they share one shape — a server action, a
 * pending state and a reset on success — not because they are related.
 */

/* ---------------------------------------------------------------- alerts */

export function AlertForm() {
  const [state, action, pending] = useActionState(createAlertAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state]);

  if (!open) {
    return (
      <div>
        <button
          type="button"
          className="btn btn-brand"
          onClick={() => setOpen(true)}
        >
          Create an alert
        </button>
        {state.ok && state.message ? (
          <p className="mt-3 text-[0.8125rem] text-[var(--color-accent)]">
            {state.message}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-5 p-6">
      <div>
        <h2 className="display text-lg">New alert</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          Buildora checks every listing at the moment it is approved and notifies
          you if it matches. Nothing already on the platform will fire it — only
          what arrives from now on.
        </p>
      </div>

      <Field label="Name this alert" htmlFor="a-label" error={state.errors?.label} required>
        <input
          id="a-label"
          name="label"
          className="input"
          placeholder="SaaS under €10,000"
          required
        />
      </Field>

      <Field
        label="Words that must appear"
        htmlFor="a-query"
        hint="All of them have to be in the listing. Leave blank to match on the filters alone."
      >
        <input
          id="a-query"
          name="query"
          className="input"
          placeholder="renewable energy"
        />
      </Field>

      <fieldset>
        <legend className="field-label">Marketplaces</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {MARKETPLACES.map((m) => (
            <label key={m.kind} className="flex items-center gap-2.5 text-[0.8125rem]">
              <input
                type="checkbox"
                name="kind"
                value={m.kind}
                className="h-4 w-4 accent-[var(--color-brand)]"
              />
              {m.name}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Maximum price (€)" htmlFor="a-max">
          <input id="a-max" name="maxPrice" className="input" inputMode="decimal" placeholder="10000" />
        </Field>
        <Field label="Minimum price (€)" htmlFor="a-min">
          <input id="a-min" name="minPrice" className="input" inputMode="decimal" />
        </Field>
      </div>

      <Field label="Country" htmlFor="a-country">
        <select id="a-country" name="country" className="select" defaultValue="">
          <option value="">Anywhere</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>

      <label className="flex items-center gap-2.5 text-[0.8125rem]">
        <input type="checkbox" name="verified" value="1" className="h-4 w-4 accent-[var(--color-brand)]" />
        Verified listings only
      </label>

      <FormMessage state={state} />

      <div className="flex gap-2.5">
        <SubmitButton pending={pending} className="btn btn-brand flex-1">
          Save alert
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- reviews */

export function ReviewForm({
  transaction,
  counterparty,
  role,
}: {
  transaction: Transaction;
  counterparty: Profile;
  role: "buyer" | "seller";
}) {
  const [state, action, pending] = useActionState(writeReviewAction, IDLE);
  const [rating, setRating] = useState(5);
  const [open, setOpen] = useState(false);

  if (state.ok) {
    return (
      <p className="text-[0.8125rem] text-[var(--color-accent)]">
        {state.message}
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn btn-outline btn-sm" onClick={() => setOpen(true)}>
        Write a review
      </button>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-4 border-t border-[var(--color-line)] pt-4">
      <input type="hidden" name="transactionId" value={transaction.id} />
      <input type="hidden" name="rating" value={rating} />

      <div>
        <span className="field-label">
          How did it go with {counterparty.full_name} as the{" "}
          {role === "buyer" ? "seller" : "buyer"}?
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRating(n)}
              aria-label={`${n} out of 5`}
              aria-pressed={rating === n}
              className={`text-2xl leading-none transition-colors ${
                n <= rating ? "text-[var(--color-gold)]" : "text-[var(--color-line-2)]"
              }`}
            >
              ★
            </button>
          ))}
        </div>
      </div>

      <Field label="Headline" htmlFor={`t-${transaction.id}`} error={state.errors?.title} required>
        <input
          id={`t-${transaction.id}`}
          name="title"
          className="input"
          placeholder="Straight answers, complete paperwork"
          required
        />
      </Field>

      <Field
        label="What happened"
        htmlFor={`b-${transaction.id}`}
        error={state.errors?.body}
        hint="Be specific and fair. This is published under your name."
        required
      >
        <textarea
          id={`b-${transaction.id}`}
          name="body"
          className="textarea min-h-28"
          required
        />
      </Field>

      <FormMessage state={state} />

      <div className="flex gap-2.5">
        <SubmitButton pending={pending} className="btn btn-brand flex-1">
          Publish review
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ----------------------------------------------------------------- goals */

const GOAL_KINDS = [
  { value: "revenue", label: "Monthly revenue" },
  { value: "customers", label: "Customers" },
  { value: "products", label: "Products" },
  { value: "growth", label: "Growth" },
  { value: "team", label: "Team" },
] as const;

export function GoalForm({ goal }: { goal?: BusinessGoal }) {
  const [state, action, pending] = useActionState(saveGoalAction, IDLE);
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && !goal) {
      formRef.current?.reset();
      setOpen(false);
    }
  }, [state, goal]);

  const asNumber = (value: number, kind: string) =>
    kind === "revenue" ? (value / 100).toFixed(0) : String(value);

  if (!open && !goal) {
    return (
      <button type="button" className="btn btn-outline w-full" onClick={() => setOpen(true)}>
        Add a goal
      </button>
    );
  }

  if (!open && goal) {
    return (
      <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(true)}>
        Update progress
      </button>
    );
  }

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5">
      {goal ? <input type="hidden" name="id" value={goal.id} /> : null}

      <Field label="Goal" htmlFor={`g-label-${goal?.id ?? "new"}`} error={state.errors?.label} required>
        <input
          id={`g-label-${goal?.id ?? "new"}`}
          name="label"
          className="input"
          defaultValue={goal?.label ?? ""}
          placeholder="Monthly recurring revenue"
          required
        />
      </Field>

      <Field label="Type" htmlFor={`g-kind-${goal?.id ?? "new"}`}>
        <select
          id={`g-kind-${goal?.id ?? "new"}`}
          name="kind"
          className="select"
          defaultValue={goal?.kind ?? "revenue"}
        >
          {GOAL_KINDS.map((k) => (
            <option key={k.value} value={k.value}>
              {k.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Where you are now" htmlFor={`g-cur-${goal?.id ?? "new"}`} error={state.errors?.current}>
          <input
            id={`g-cur-${goal?.id ?? "new"}`}
            name="current"
            className="input"
            inputMode="decimal"
            defaultValue={goal ? asNumber(goal.current, goal.kind) : "0"}
          />
        </Field>
        <Field label="Target" htmlFor={`g-tar-${goal?.id ?? "new"}`} error={state.errors?.target} required>
          <input
            id={`g-tar-${goal?.id ?? "new"}`}
            name="target"
            className="input"
            inputMode="decimal"
            defaultValue={goal ? asNumber(goal.target, goal.kind) : ""}
            required
          />
        </Field>
      </div>

      <Field label="Target date" htmlFor={`g-due-${goal?.id ?? "new"}`} hint="Optional.">
        <input
          id={`g-due-${goal?.id ?? "new"}`}
          name="dueOn"
          type="date"
          className="input"
          defaultValue={goal?.due_on?.slice(0, 10) ?? ""}
        />
      </Field>

      <FormMessage state={state} />

      <div className="flex gap-2.5">
        <SubmitButton pending={pending} className="btn btn-brand flex-1">
          {goal ? "Save" : "Add goal"}
        </SubmitButton>
        <button type="button" className="btn btn-ghost" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}

/* --------------------------------------------------------------- metrics */

export function MetricForm({ defaultMonth }: { defaultMonth: string }) {
  const [state, action, pending] = useActionState(saveMetricAction, IDLE);

  return (
    <form action={action} className="card space-y-4 p-6">
      <div>
        <h2 className="display text-lg">Record a month</h2>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
          Figures you enter yourself. Buildora does not connect to your bank or
          your accounting system, so nothing here is audited or verified —
          it is your own record, drawn as a chart.
        </p>
      </div>

      <Field label="Month" htmlFor="m-month" error={state.errors?.month} required>
        <input
          id="m-month"
          name="month"
          type="month"
          className="input"
          defaultValue={defaultMonth}
          required
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Revenue (€)" htmlFor="m-rev">
          <input id="m-rev" name="revenue" className="input" inputMode="decimal" placeholder="4000" />
        </Field>
        <Field label="Expenses (€)" htmlFor="m-exp">
          <input id="m-exp" name="expenses" className="input" inputMode="decimal" placeholder="2360" />
        </Field>
        <Field label="Customers" htmlFor="m-cus">
          <input id="m-cus" name="customers" className="input" inputMode="numeric" placeholder="17" />
        </Field>
      </div>

      <FormMessage state={state} />

      <SubmitButton pending={pending} className="btn btn-brand w-full">
        Save figures
      </SubmitButton>
    </form>
  );
}

/* --------------------------------------------------------------- network */

export function PostComposer() {
  const [state, action, pending] = useActionState(createPostAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="card space-y-4 p-5 lg:p-6">
      <Field label="Share an update" htmlFor="p-body" error={state.errors?.body}>
        <textarea
          id="p-body"
          name="body"
          className="textarea min-h-24"
          placeholder="What changed in your business this week? What are you looking for?"
          required
        />
      </Field>

      <div className="flex flex-wrap items-center gap-3">
        <select name="kind" className="select w-auto" defaultValue="update">
          <option value="update">Update</option>
          <option value="milestone">Milestone</option>
          <option value="opportunity">Opportunity</option>
        </select>
        <SubmitButton pending={pending} className="btn btn-brand">
          Post
        </SubmitButton>
      </div>

      <FormMessage state={state} />

      <p className="text-[0.6875rem] leading-relaxed text-[var(--color-ink-3)]">
        This is a professional feed. Posts about your business, what you have
        learned or what you need are welcome; anything else will be removed.
      </p>
    </form>
  );
}
