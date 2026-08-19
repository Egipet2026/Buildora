"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import {
  respondToOfferAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { calculateFees, formatMoney, timeAgo } from "@/lib/money";
import type { Offer, OfferStatus, Profile } from "@/lib/types";

const STATUS_BADGE: Record<OfferStatus, string> = {
  pending: "badge-brand",
  accepted: "badge-verified",
  rejected: "badge-danger",
  countered: "badge-neutral",
  withdrawn: "badge-neutral",
};

const STATUS_LABEL: Record<OfferStatus, string> = {
  pending: "Awaiting response",
  accepted: "Accepted",
  rejected: "Declined",
  countered: "Countered",
  withdrawn: "Withdrawn",
};

export interface OfferThreadProps {
  history: Offer[];
  latest: Offer;
  role: "buyer" | "seller";
  meId: string;
  counterparty: Profile | null;
  listing: { id: string; title: string; currency: string } | null;
  commissionBps: number;
}

export function OfferThreadCard({
  history,
  latest,
  role,
  meId,
  counterparty,
  listing,
  commissionBps,
}: OfferThreadProps) {
  const router = useRouter();
  const [state, action, pending] = useActionState(respondToOfferAction, IDLE);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState("");

  useEffect(() => {
    if (state.ok) {
      setCounterOpen(false);
      router.refresh();
    }
  }, [state, router]);

  // Whoever did not send the latest offer is the one who can answer it.
  const lastSenderIsMe =
    latest.parent_offer_id === null
      ? latest.buyer_id === meId
      : role === "seller"
        ? // A counter alternates sides: the root came from the buyer.
          history.length % 2 === 0
        : history.length % 2 === 1;

  const canRespond = latest.status === "pending" && !lastSenderIsMe;
  const currency = listing?.currency ?? "EUR";
  const fees = calculateFees(latest.amount_cents, commissionBps);

  const parsedCounter = Math.round(
    parseFloat(counterAmount.replace(/[^0-9.]/g, "")) * 100,
  );

  return (
    <div className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] p-5">
        <div className="min-w-0">
          <p className="eyebrow mb-1.5">
            {role === "buyer" ? "Your offer to" : "Offer from"}{" "}
            {counterparty?.full_name ?? "a member"}
          </p>
          {listing ? (
            <Link
              href={`/listing/${listing.id}`}
              className="font-semibold leading-snug hover:text-[var(--color-brand)]"
            >
              {listing.title}
            </Link>
          ) : (
            <p className="font-semibold text-[var(--color-ink-3)]">
              Listing removed
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="display text-2xl">
            {formatMoney(latest.amount_cents, currency)}
          </p>
          <span className={`badge ${STATUS_BADGE[latest.status]} mt-1.5`}>
            {STATUS_LABEL[latest.status]}
          </span>
        </div>
      </div>

      {/* Full negotiation history, oldest first. */}
      <ol className="divide-y divide-[var(--color-line)]">
        {history.map((offer, i) => {
          const fromMe =
            i === 0 ? offer.buyer_id === meId : (i % 2 === 0) === (role === "buyer");
          return (
            <li key={offer.id} className="flex gap-4 p-5">
              <div className="flex flex-col items-center">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--color-surface-2)] text-[0.6875rem] font-bold">
                  {i + 1}
                </span>
                {i < history.length - 1 ? (
                  <span className="mt-1 w-px flex-1 bg-[var(--color-line)]" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[0.875rem] font-semibold">
                    {i === 0 ? "Offer" : "Counter-offer"} ·{" "}
                    {formatMoney(offer.amount_cents, currency)}
                  </p>
                  <span className="text-[0.75rem] text-[var(--color-ink-3)]">
                    {fromMe ? "You" : (counterparty?.full_name ?? "Them")} ·{" "}
                    {timeAgo(offer.created_at)}
                  </span>
                </div>
                {offer.message ? (
                  <p className="mt-1.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-2)]">
                    {offer.message}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {latest.status === "pending" ? (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-surface-2)] p-5">
          <dl className="mb-4 grid grid-cols-3 gap-3 text-[0.8125rem]">
            <div>
              <dt className="text-[var(--color-ink-3)]">Offer</dt>
              <dd className="font-semibold">
                {formatMoney(fees.amount_cents, currency)}
              </dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-3)]">
                Fee ({fees.fee_percent}%)
              </dt>
              <dd>{formatMoney(fees.fee_cents, currency)}</dd>
            </div>
            <div>
              <dt className="text-[var(--color-ink-3)]">Seller gets</dt>
              <dd className="font-semibold text-[var(--color-accent)]">
                {formatMoney(fees.net_cents, currency)}
              </dd>
            </div>
          </dl>

          {canRespond ? (
            <div className="flex flex-wrap gap-2.5">
              <form action={action}>
                <input type="hidden" name="offerId" value={latest.id} />
                <input type="hidden" name="action" value="accept" />
                <button
                  type="submit"
                  className="btn btn-brand btn-sm"
                  disabled={pending}
                >
                  Accept
                </button>
              </form>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => setCounterOpen(true)}
              >
                Counter
              </button>
              <form action={action}>
                <input type="hidden" name="offerId" value={latest.id} />
                <input type="hidden" name="action" value="reject" />
                <button
                  type="submit"
                  className="btn btn-ghost btn-sm"
                  disabled={pending}
                >
                  Decline
                </button>
              </form>
            </div>
          ) : (
            <p className="text-[0.8125rem] text-[var(--color-ink-3)]">
              Waiting for {counterparty?.full_name ?? "the other party"} to
              respond.
            </p>
          )}

          <FormMessage state={state} />
        </div>
      ) : latest.status === "accepted" ? (
        <div className="border-t border-[var(--color-line)] bg-[var(--color-accent-tint)] p-5">
          <p className="text-[0.875rem] font-semibold text-[#0a6b57]">
            Offer accepted at {formatMoney(latest.amount_cents, currency)}
          </p>
          <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
            Documents marked “after an accepted offer” are now available on the
            listing. Agree the remaining terms in writing — an accepted offer on
            Buildora is not a contract of sale.
          </p>
          <Link href="/messages" className="btn btn-outline btn-sm mt-3">
            Continue in messages
          </Link>
        </div>
      ) : null}

      <Dialog
        open={counterOpen}
        onClose={() => setCounterOpen(false)}
        title="Send a counter-offer"
        description={`Currently on the table: ${formatMoney(latest.amount_cents, currency)}`}
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="offerId" value={latest.id} />
          <input type="hidden" name="action" value="counter" />

          <div>
            <label className="field-label" htmlFor={`counter-${latest.id}`}>
              Your counter ({currency})
            </label>
            <input
              id={`counter-${latest.id}`}
              name="amount"
              className="input"
              inputMode="decimal"
              value={counterAmount}
              onChange={(e) => setCounterAmount(e.target.value)}
              required
            />
            {state.errors?.amount ? (
              <p className="field-error">{state.errors.amount}</p>
            ) : null}
          </div>

          {Number.isFinite(parsedCounter) && parsedCounter > 0 ? (
            <dl className="rounded-lg bg-[var(--color-surface-2)] p-3.5 text-[0.8125rem]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Platform fee</dt>
                <dd>
                  {formatMoney(
                    calculateFees(parsedCounter, commissionBps).fee_cents,
                    currency,
                  )}
                </dd>
              </div>
              <div className="mt-1.5 flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Seller receives</dt>
                <dd className="font-semibold">
                  {formatMoney(
                    calculateFees(parsedCounter, commissionBps).net_cents,
                    currency,
                  )}
                </dd>
              </div>
            </dl>
          ) : null}

          <div>
            <label className="field-label" htmlFor={`counter-msg-${latest.id}`}>
              Message
            </label>
            <textarea
              id={`counter-msg-${latest.id}`}
              name="message"
              className="textarea"
              placeholder="Explain the number — what is included at this price, and what is not."
              required
            />
            {state.errors?.message ? (
              <p className="field-error">{state.errors.message}</p>
            ) : null}
          </div>

          <FormMessage state={state} />
          <SubmitButton pending={pending}>Send counter-offer</SubmitButton>
        </form>
      </Dialog>
    </div>
  );
}
