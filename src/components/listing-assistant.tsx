"use client";

import { useActionState, useState } from "react";
import { FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import { draftListingAction } from "@/lib/actions";
import type { ListingDraftState } from "@/lib/action-state";
import type { ListingDraft, ListingKind } from "@/lib/types";

const DRAFT_IDLE: ListingDraftState = { ok: false };

/**
 * Drafting help for a seller writing a listing.
 *
 * It proposes; the seller disposes. Nothing it produces reaches the form until
 * the seller has read it and pressed apply, and everything stays editable
 * afterwards — the listing is published under their name and their legal
 * responsibility, so they have to own every word of it.
 */
export function ListingAssistant({
  kind,
  title,
  onApply,
}: {
  kind: ListingKind;
  title: string;
  onApply: (draft: ListingDraft) => void;
}) {
  const [state, action, pending] = useActionState(draftListingAction, DRAFT_IDLE);
  const [open, setOpen] = useState(false);
  const [applied, setApplied] = useState(false);
  const draft = state.draft;

  if (!open) {
    return (
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-dashed border-[var(--color-line-2)] px-4 py-3.5">
        <p className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
          Rough notes are enough — the assistant turns them into a title,
          summary and description you then edit.
        </p>
        <button
          type="button"
          className="btn btn-outline btn-sm shrink-0"
          onClick={() => setOpen(true)}
        >
          ✦ Improve with AI
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--color-line-2)] bg-[var(--color-surface-2)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold">Drafting assistant</h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
            It rewrites only what you tell it. It will not add revenue figures,
            customer numbers or claims you did not make — anything missing comes
            back as a question to answer yourself.
          </p>
        </div>
        <button
          type="button"
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-[var(--color-ink-3)] hover:bg-[var(--color-surface)]"
          onClick={() => setOpen(false)}
          aria-label="Close the assistant"
        >
          ×
        </button>
      </div>

      {/* A nested <form> is invalid HTML, so this posts through its own
          action rather than the listing form around it. */}
      <div className="mt-4 space-y-4">
        <input type="hidden" name="kind" value={kind} />

        <Field
          label="What are you selling?"
          htmlFor="ai-notes"
          error={state.errors?.notes}
          hint="Facts, not prose. What it is, what is included, how it makes money, why you are selling."
        >
          <textarea
            id="ai-notes"
            name="notes"
            form="ai-draft-form"
            className="textarea min-h-28"
            placeholder="Email deliverability SaaS, started 2021, 412 paying teams, mostly agencies. Built on Rails. Selling because I am moving to a new project."
          />
        </Field>

        <form id="ai-draft-form" action={action}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="title" value={title} />
          <SubmitButton pending={pending} className="btn btn-brand w-full">
            Draft it
          </SubmitButton>
        </form>

        {state.message && !state.ok ? <FormMessage state={state} /> : null}

        {draft ? (
          <div className="space-y-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
            <div>
              <p className="eyebrow mb-1">Title</p>
              <p className="text-[0.875rem] font-medium">{draft.title}</p>
            </div>
            <div>
              <p className="eyebrow mb-1">Summary</p>
              <p className="text-[0.875rem] text-[var(--color-ink-2)]">
                {draft.summary}
              </p>
            </div>
            <div>
              <p className="eyebrow mb-1">Description</p>
              <p className="whitespace-pre-line text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
                {draft.description}
              </p>
            </div>

            {draft.tags.length ? (
              <div>
                <p className="eyebrow mb-1.5">Suggested keywords</p>
                <div className="flex flex-wrap gap-1.5">
                  {draft.tags.map((tag) => (
                    <span key={tag} className="badge">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {draft.faq.length ? (
              <div>
                <p className="eyebrow mb-1.5">Questions buyers will ask</p>
                <dl className="space-y-2">
                  {draft.faq.map((item) => (
                    <div key={item.question}>
                      <dt className="text-[0.8125rem] font-medium">
                        {item.question}
                      </dt>
                      <dd className="text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
                        {item.answer}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}

            <button
              type="button"
              className="btn btn-brand w-full"
              onClick={() => {
                onApply(draft);
                setApplied(true);
              }}
            >
              {applied ? "Applied — edit the fields below" : "Use this draft"}
            </button>

            <p className="text-[0.6875rem] leading-relaxed text-[var(--color-ink-3)]">
              Read every line before you publish. The listing is yours, and you
              are responsible for what it says about your business.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
