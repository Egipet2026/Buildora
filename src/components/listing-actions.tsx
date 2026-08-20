"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import {
  createOfferAction,
  mockCheckoutAction,
  reportAction,
  startConversationAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { calculateFees, formatMoney } from "@/lib/money";
import { startPurchaseAction } from "@/lib/payments/actions";
import type { DealType } from "@/lib/types";

const DEAL_LABELS: Record<DealType, string> = {
  purchase: "Buy rights / purchase",
  license_exclusive: "Exclusive licence",
  license_non_exclusive: "Non-exclusive licence",
};

interface Common {
  listingId: string;
  listingTitle: string;
  currency: string;
}

/** Navigates on success so the user lands where the action took effect. */
function useRedirectOnSuccess(state: { ok: boolean; redirectTo?: string }) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);
}

/* --------------------------------------------------------- make an offer */

export function OfferButton({
  listingId,
  listingTitle,
  currency,
  dealTypes,
  askingPrice,
  licensePrice,
  licensePeriod,
  disabled,
  label = "Make an Offer",
  className = "btn btn-outline w-full",
}: Common & {
  dealTypes: DealType[];
  askingPrice: number;
  licensePrice?: number;
  licensePeriod?: string;
  disabled?: boolean;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(createOfferAction, IDLE);
  const [dealType, setDealType] = useState<DealType>(dealTypes[0] ?? "purchase");
  const [amount, setAmount] = useState("");

  useRedirectOnSuccess(state);

  const suggested =
    dealType === "purchase"
      ? askingPrice
      : (licensePrice ?? Math.round(askingPrice / 10));
  const parsed = Math.round(parseFloat(amount.replace(/[^0-9.]/g, "")) * 100);
  const fees = calculateFees(Number.isFinite(parsed) && parsed > 0 ? parsed : 0);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Make an offer"
        description={listingTitle}
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />

          {dealTypes.length > 1 ? (
            <div>
              <label className="field-label" htmlFor="offer-deal">
                What are you offering for?
              </label>
              <select
                id="offer-deal"
                name="dealType"
                className="select"
                value={dealType}
                onChange={(e) => setDealType(e.target.value as DealType)}
              >
                {dealTypes.map((d) => (
                  <option key={d} value={d}>
                    {DEAL_LABELS[d]}
                  </option>
                ))}
              </select>
              {dealType !== "purchase" ? (
                <p className="field-hint">
                  A licence grants use on agreed terms; the rights holder keeps
                  ownership. Exclusivity, territory and duration are negotiated
                  between you and them, in a written agreement.
                </p>
              ) : null}
            </div>
          ) : (
            <input type="hidden" name="dealType" value={dealTypes[0] ?? "purchase"} />
          )}

          <div>
            <label className="field-label" htmlFor="offer-amount">
              Your offer ({currency})
              {dealType !== "purchase" && licensePeriod
                ? ` per ${licensePeriod}`
                : ""}
            </label>
            <input
              id="offer-amount"
              name="amount"
              className="input"
              inputMode="decimal"
              placeholder={
                suggested ? (suggested / 100).toFixed(0) : "Enter an amount"
              }
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
            {state.errors?.amount ? (
              <p className="field-error">{state.errors.amount}</p>
            ) : suggested ? (
              <p className="field-hint">
                Asking: {formatMoney(suggested, currency)}
              </p>
            ) : null}
          </div>

          {fees.amount_cents > 0 ? (
            <dl className="rounded-lg bg-[var(--color-surface-2)] p-3.5 text-[0.8125rem]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Your offer</dt>
                <dd className="font-semibold">
                  {formatMoney(fees.amount_cents, currency)}
                </dd>
              </div>
              <div className="mt-1.5 flex justify-between">
                <dt className="text-[var(--color-ink-3)]">
                  Platform fee ({fees.fee_percent}%, paid by the seller)
                </dt>
                <dd>{formatMoney(fees.fee_cents, currency)}</dd>
              </div>
              <div className="mt-1.5 flex justify-between border-t border-[var(--color-line)] pt-1.5">
                <dt className="text-[var(--color-ink-3)]">Seller receives</dt>
                <dd className="font-semibold">
                  {formatMoney(fees.net_cents, currency)}
                </dd>
              </div>
            </dl>
          ) : null}

          <div>
            <label className="field-label" htmlFor="offer-message">
              Message to the seller
            </label>
            <textarea
              id="offer-message"
              name="message"
              className="textarea"
              placeholder="Introduce yourself, explain how you would fund the purchase, and say what you would need to see during due diligence."
              required
            />
            {state.errors?.message ? (
              <p className="field-error">{state.errors.message}</p>
            ) : null}
          </div>

          <FormMessage state={state} />

          <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
            An offer opens a negotiation — it is not a binding contract. Nothing
            is agreed until both sides sign written terms.
          </p>

          <SubmitButton pending={pending}>Send offer</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------- contact seller */

export function ContactButton({
  listingId,
  listingTitle,
  sellerName,
  disabled,
  className = "btn btn-outline w-full",
}: Omit<Common, "currency"> & {
  sellerName: string;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(startConversationAction, IDLE);

  useRedirectOnSuccess(state);

  return (
    <>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Contact Seller
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${sellerName}`}
        description={listingTitle}
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <div>
            <label className="field-label" htmlFor="contact-body">
              Your message
            </label>
            <textarea
              id="contact-body"
              name="body"
              className="textarea"
              placeholder="Ask about the numbers, the handover, why they are selling — anything you need before making an offer."
              required
            />
            {state.errors?.body ? (
              <p className="field-error">{state.errors.body}</p>
            ) : null}
          </div>

          <FormMessage state={state} />

          <p className="text-[0.75rem] leading-relaxed text-[var(--color-ink-3)]">
            Conversations stay on Buildora. Your email address is never shared
            with the other party. Keep negotiations here so there is a record if
            something goes wrong.
          </p>

          <SubmitButton pending={pending}>Send message</SubmitButton>
        </form>
      </Dialog>
    </>
  );
}

/* ---------------------------------------------------------- mock buy now */

export function BuyNowButton({
  listingId,
  listingTitle,
  currency,
  priceCents,
  commissionBps,
  disabled,
  payByCard,
}: Common & {
  priceCents: number;
  commissionBps: number;
  disabled?: boolean;
  /**
   * True when a card can actually be charged for this listing — Stripe is
   * configured and this seller has finished onboarding. When it is false the
   * button still works, but it records the sale without moving money and says
   * so, rather than showing a payment page that would fail.
   */
  payByCard: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    payByCard ? startPurchaseAction : mockCheckoutAction,
    IDLE,
  );
  const fees = calculateFees(priceCents, commissionBps);

  // A card payment leaves for Stripe instead of redirecting inside the app.
  useRedirectOnSuccess(state);

  return (
    <>
      <button
        type="button"
        className="btn btn-brand w-full"
        onClick={() => setOpen(true)}
        disabled={disabled}
      >
        Buy Now — {formatMoney(priceCents, currency)}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Review the transaction"
        description={listingTitle}
      >
        <form action={action} className="space-y-5">
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="amount" value={priceCents} />

          <dl className="space-y-3 rounded-lg bg-[var(--color-surface-2)] p-4">
            <div className="flex items-baseline justify-between">
              <dt className="text-[0.875rem] text-[var(--color-ink-2)]">
                Agreed price
              </dt>
              <dd className="display text-xl">
                {formatMoney(fees.amount_cents, currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-[0.875rem] text-[var(--color-ink-2)]">
                Platform fee ({fees.fee_percent}%)
              </dt>
              <dd className="font-semibold text-[var(--color-danger)]">
                −{formatMoney(fees.fee_cents, currency)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-[var(--color-line)] pt-3">
              <dt className="text-[0.875rem] font-medium">Seller receives</dt>
              <dd className="display text-xl text-[var(--color-accent)]">
                {formatMoney(fees.net_cents, currency)}
              </dd>
            </div>
          </dl>

          <div className="rounded-lg border border-[#ecd9b0] bg-[var(--color-gold-tint)] px-4 py-3.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-2)]">
            {payByCard ? (
              <>
                <strong className="font-semibold">
                  Buildora is not an escrow service.
                </strong>{" "}
                Your card is charged by Stripe and the money settles to the
                seller, less the platform fee. Buildora does not hold the funds
                and cannot reverse the payment for you. Paying does not
                transfer ownership of anything — agree in writing with the
                seller how the business, domain, patent or account actually
                changes hands, and take your own legal advice before you pay.
              </>
            ) : (
              <>
                <strong className="font-semibold">No payment is taken.</strong>{" "}
                This records the deal and the commission split so both sides can
                see the numbers, but it moves no money — this seller has not
                connected a payout account. Settle the actual transfer of money
                and ownership between yourselves.
              </>
            )}
          </div>

          <FormMessage state={state} />

          <SubmitButton pending={pending}>
            {payByCard
              ? `Pay ${formatMoney(fees.amount_cents, currency)} with Stripe`
              : "Record the transaction"}
          </SubmitButton>
        </form>
      </Dialog>
    </>
  );
}

/* --------------------------------------------------------------- report */

const REASONS = [
  "Misleading or false claims",
  "Suspected scam or fraud",
  "Rights not held by the seller",
  "Duplicate or spam listing",
  "Offensive or prohibited content",
  "Something else",
];

export function ReportButton({
  targetType,
  targetId,
  label = "Report this listing",
}: {
  targetType: "listing" | "user" | "message";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(reportAction, IDLE);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[0.75rem] text-[var(--color-ink-3)] underline underline-offset-2 hover:text-[var(--color-danger)]"
      >
        {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Report to moderators"
        description="Reports are reviewed by the Buildora team. The person you report is not told who reported them."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="targetType" value={targetType} />
          <input type="hidden" name="targetId" value={targetId} />

          <div>
            <label className="field-label" htmlFor="report-reason">
              Reason
            </label>
            <select id="report-reason" name="reason" className="select" required>
              {REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label" htmlFor="report-details">
              Details
            </label>
            <textarea
              id="report-details"
              name="details"
              className="textarea"
              placeholder="What did you see, and what makes you think it breaks the rules?"
            />
          </div>

          <FormMessage state={state} />
          <SubmitButton pending={pending} className="btn btn-danger w-full">
            Submit report
          </SubmitButton>
        </form>
      </Dialog>
    </>
  );
}
