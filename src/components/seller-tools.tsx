"use client";

import { useActionState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import {
  promoteListingAction,
  requestVerificationAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { useState } from "react";

/** Buys a Featured slot or a Boost for one of the seller's own listings. */
export function PromoteForm({
  listings,
  featuredPrice,
  featuredDays,
  boostPrice,
  boostDays,
}: {
  listings: { id: string; title: string }[];
  featuredPrice: string;
  featuredDays: number;
  boostPrice: string;
  boostDays: number;
}) {
  const [state, action, pending] = useActionState(promoteListingAction, IDLE);

  if (!listings.length) return null;

  return (
    <form action={action} className="card space-y-5 p-6">
      <h2 className="text-[0.9375rem] font-semibold">Promote a listing</h2>

      <Field label="Listing" htmlFor="promote-listing" required>
        <select id="promote-listing" name="listingId" className="select" required>
          {listings.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </Field>

      <fieldset>
        <legend className="field-label">Placement</legend>
        <div className="space-y-2.5">
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--color-line-2)] p-4">
            <input
              type="radio"
              name="plan"
              value="featured"
              defaultChecked
              className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block text-[0.875rem] font-semibold">
                Featured — {featuredPrice} / {featuredDays} days
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                Appears in the Featured rails on the home page and at the top of
                its marketplace, labelled as paid placement.
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer gap-3 rounded-xl border border-[var(--color-line-2)] p-4">
            <input
              type="radio"
              name="plan"
              value="boost"
              className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
            />
            <span>
              <span className="block text-[0.875rem] font-semibold">
                Boost — {boostPrice} / {boostDays} days
              </span>
              <span className="mt-0.5 block text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
                Lifts your listing within whatever sort order a buyer chooses,
                without overriding their intent.
              </span>
            </span>
          </label>
        </div>
      </fieldset>

      <FormMessage state={state} />

      <SubmitButton pending={pending} className="btn btn-brand w-full">
        Activate (test billing)
      </SubmitButton>

      <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
        No payment is taken in this MVP. Promotion activates immediately so the
        placement behaviour can be evaluated end to end.
      </p>
    </form>
  );
}

/** Requests seller, business or patent verification. */
export function VerificationForm({
  listings,
}: {
  listings: { id: string; title: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<"seller" | "business" | "patent">("seller");
  const [state, action, pending] = useActionState(requestVerificationAction, IDLE);

  const placeholder = {
    seller:
      "Company registration number, the jurisdiction it is registered in, and which identity documents you can provide.",
    business:
      "Which of these you can provide: filed accounts, merchant or payment-processor statements, analytics access, domain ownership proof, supplier contracts.",
    patent:
      "The patent or application number, the office it was filed with, the recorded proprietor, and any assignment or licence records you hold.",
  }[kind];

  return (
    <>
      <button
        type="button"
        className="btn btn-brand"
        onClick={() => setOpen(true)}
      >
        Request verification
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Request verification"
        description="Tell us what you can evidence. A reviewer checks it against the public record and the documents you provide."
      >
        <form action={action} className="space-y-4">
          <Field label="What should we verify?" htmlFor="v-kind" required>
            <select
              id="v-kind"
              name="kind"
              className="select"
              value={kind}
              onChange={(e) =>
                setKind(e.target.value as "seller" | "business" | "patent")
              }
            >
              <option value="seller">Me as a seller (identity / company)</option>
              <option value="business">A business listing</option>
              <option value="patent">A patent or technology listing</option>
            </select>
          </Field>

          {kind !== "seller" && listings.length ? (
            <Field label="Which listing?" htmlFor="v-listing" required>
              <select id="v-listing" name="listingId" className="select" required>
                {listings.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          <Field
            label="Evidence you can provide"
            htmlFor="v-evidence"
            error={state.errors?.evidence}
            required
          >
            <textarea
              id="v-evidence"
              name="evidence"
              className="textarea min-h-32"
              placeholder={placeholder}
              required
            />
          </Field>

          <div className="rounded-lg border border-[#ecd9b0] bg-[var(--color-gold-tint)] px-4 py-3.5 text-[0.75rem] leading-relaxed text-[var(--color-ink-2)]">
            Verification confirms that specific information you supplied matches
            the evidence and the public record, so far as Buildora can lawfully
            check it. It is <strong>not</strong> an audit, a valuation, a
            validity or freedom-to-operate opinion, or a statement that buying
            from you is a good decision.
          </div>

          <FormMessage state={state} />
          <SubmitButton pending={pending}>Submit request</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
