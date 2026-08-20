"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import { Field } from "./ui";
import {
  adminModerateListingAction,
  adminReportAction,
  adminSettingsAction,
  adminUserAction,
  adminVerificationAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import type { PlatformSettings } from "@/lib/types";

function useRefreshOnSuccess(state: { ok: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (state.ok) router.refresh();
  }, [state, router]);
}

/* ------------------------------------------------------- listing moderation */

export function ModerateListing({
  listingId,
  status,
  isVerified,
  isFeatured,
}: {
  listingId: string;
  status: string;
  isVerified: boolean;
  isFeatured: boolean;
}) {
  const [state, action, pending] = useActionState(
    adminModerateListingAction,
    IDLE,
  );
  const [rejectOpen, setRejectOpen] = useState(false);
  useRefreshOnSuccess(state);

  useEffect(() => {
    if (state.ok) setRejectOpen(false);
  }, [state]);

  const Btn = ({
    decision,
    label,
    className = "btn btn-outline btn-sm",
  }: {
    decision: string;
    label: string;
    className?: string;
  }) => (
    <form action={action} className="inline">
      <input type="hidden" name="listingId" value={listingId} />
      <input type="hidden" name="decision" value={decision} />
      <button type="submit" className={className} disabled={pending}>
        {label}
      </button>
    </form>
  );

  return (
    <div className="flex flex-wrap gap-1.5">
      {status === "pending" || status === "rejected" ? (
        <Btn decision="approve" label="Approve" className="btn btn-brand btn-sm" />
      ) : null}
      {status !== "rejected" ? (
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => setRejectOpen(true)}
        >
          Reject
        </button>
      ) : null}
      <Btn
        decision={isVerified ? "unverify" : "verify"}
        label={isVerified ? "Un-verify" : "Verify"}
      />
      <Btn
        decision={isFeatured ? "unfeature" : "feature"}
        label={isFeatured ? "Un-feature" : "Feature"}
      />
      {status === "active" ? <Btn decision="archive" label="Archive" /> : null}

      <Dialog
        open={rejectOpen}
        onClose={() => setRejectOpen(false)}
        title="Reject this listing"
        description="The reason is sent to the seller. Be specific enough that they can fix it and resubmit."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="listingId" value={listingId} />
          <input type="hidden" name="decision" value="reject" />
          <Field
            label="Reason for rejection"
            htmlFor={`reason-${listingId}`}
            error={state.errors?.reason}
            required
          >
            <textarea
              id={`reason-${listingId}`}
              name="reason"
              className="textarea"
              placeholder="e.g. Revenue claims could not be evidenced, and the listing describes a pending application as a granted patent."
              required
            />
          </Field>
          <FormMessage state={state} />
          <SubmitButton pending={pending} className="btn btn-danger w-full">
            Reject and notify seller
          </SubmitButton>
        </form>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------ user actions */

export function ModerateUser({
  userId,
  isBlocked,
  isVerified,
  isSelf,
}: {
  userId: string;
  isBlocked: boolean;
  isVerified: boolean;
  isSelf: boolean;
}) {
  const [state, action, pending] = useActionState(adminUserAction, IDLE);
  useRefreshOnSuccess(state);

  if (isSelf) {
    return (
      <span className="text-[0.75rem] text-[var(--color-ink-3)]">
        Your account
      </span>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      <form action={action} className="inline">
        <input type="hidden" name="userId" value={userId} />
        <input
          type="hidden"
          name="action"
          value={isVerified ? "unverify" : "verify"}
        />
        <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>
          {isVerified ? "Un-verify" : "Verify"}
        </button>
      </form>
      <form action={action} className="inline">
        <input type="hidden" name="userId" value={userId} />
        <input
          type="hidden"
          name="action"
          value={isBlocked ? "unblock" : "block"}
        />
        <button
          type="submit"
          className={`btn btn-sm ${isBlocked ? "btn-outline" : "btn-ghost"}`}
          disabled={pending}
        >
          {isBlocked ? "Unblock" : "Block"}
        </button>
      </form>
    </div>
  );
}

/* ---------------------------------------------------------- report actions */

export function ResolveReport({ reportId }: { reportId: string }) {
  const [state, action, pending] = useActionState(adminReportAction, IDLE);
  useRefreshOnSuccess(state);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="reportId" value={reportId} />
      <select
        name="status"
        className="select !py-1.5 !text-[0.8125rem]"
        defaultValue="reviewing"
        aria-label="Report status"
      >
        <option value="open">Open</option>
        <option value="reviewing">Reviewing</option>
        <option value="resolved">Resolved</option>
        <option value="dismissed">Dismissed</option>
      </select>
      <button type="submit" className="btn btn-outline btn-sm" disabled={pending}>
        Update
      </button>
    </form>
  );
}

/* ---------------------------------------------------- verification actions */

export function ReviewVerification({ requestId }: { requestId: string }) {
  const [state, action, pending] = useActionState(adminVerificationAction, IDLE);
  const [open, setOpen] = useState(false);
  useRefreshOnSuccess(state);

  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state]);

  return (
    <>
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setOpen(true)}
      >
        Review
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Review verification request"
        description="Approve only what the evidence supports. Verification confirms facts — it never certifies quality or value."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="requestId" value={requestId} />
          <Field label="Reviewer notes" htmlFor={`notes-${requestId}`}>
            <textarea
              id={`notes-${requestId}`}
              name="notes"
              className="textarea"
              placeholder="What was checked, against what source, and on what date."
            />
          </Field>
          <FormMessage state={state} />
          <div className="flex gap-2.5">
            <button
              type="submit"
              name="decision"
              value="verified"
              className="btn btn-brand flex-1"
              disabled={pending}
            >
              Approve
            </button>
            <button
              type="submit"
              name="decision"
              value="rejected"
              className="btn btn-outline flex-1"
              disabled={pending}
            >
              Reject
            </button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

/* -------------------------------------------------------------- settings */

export function SettingsForm({ settings }: { settings: PlatformSettings }) {
  const [state, action, pending] = useActionState(adminSettingsAction, IDLE);
  useRefreshOnSuccess(state);

  const fields = [
    {
      name: "commissionPercent",
      label: "Transaction commission (%)",
      value: settings.commission_bps / 100,
      step: "0.1",
      hint: "Applied to every completed transaction.",
    },
    {
      name: "featuredPrice",
      label: "Featured price (€)",
      value: settings.featured_price_cents / 100,
      step: "0.01",
    },
    {
      name: "featuredDays",
      label: "Featured duration (days)",
      value: settings.featured_days,
      step: "1",
    },
    {
      name: "boostPrice",
      label: "Boost price (€)",
      value: settings.boost_price_cents / 100,
      step: "0.01",
    },
    {
      name: "boostDays",
      label: "Boost duration (days)",
      value: settings.boost_days,
      step: "1",
    },
    {
      name: "premiumPrice",
      label: "Premium Seller (€ / month)",
      value: settings.premium_monthly_cents / 100,
      step: "0.01",
    },
    {
      name: "verificationFee",
      label: "Verification fee (€)",
      value: settings.verification_fee_cents / 100,
      step: "0.01",
    },
  ];

  return (
    <form action={action} className="card p-6 lg:p-8">
      <h2 className="text-lg font-semibold tracking-[-0.015em]">
        Pricing & fees
      </h2>
      <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-[var(--color-ink-3)]">
        Changes apply to new transactions and promotions immediately. Deals
        already agreed keep the rate they were quoted at.
      </p>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {fields.map((field) => (
          <Field key={field.name} label={field.label} htmlFor={field.name} hint={field.hint}>
            <input
              id={field.name}
              name={field.name}
              className="input"
              type="number"
              min={0}
              step={field.step}
              defaultValue={field.value}
            />
          </Field>
        ))}
      </div>

      <div className="mt-6 space-y-4">
        <FormMessage state={state} />
        <SubmitButton pending={pending} className="btn btn-brand">
          Save pricing
        </SubmitButton>
      </div>
    </form>
  );
}
