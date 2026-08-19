"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { Dialog, FormMessage, SubmitButton } from "./dialog";
import { startDirectConversationAction } from "@/lib/actions";
import { IDLE } from "@/lib/action-state";

/**
 * Opens a conversation with a member directly, without a listing in between.
 *
 * The first message goes through the same inbox as every other conversation,
 * so blocking, reporting and read receipts all apply unchanged.
 */
export function MessageMemberButton({
  memberId,
  memberName,
  className = "btn btn-brand w-full",
  label = "Send a message",
  placeholder,
}: {
  memberId: string;
  memberName: string;
  className?: string;
  label?: string;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(
    startDirectConversationAction,
    IDLE,
  );
  const router = useRouter();

  useEffect(() => {
    if (state.ok && state.redirectTo) router.push(state.redirectTo);
  }, [state, router]);

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        {label}
      </button>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Message ${memberName}`}
        description="They see your name and your Buildora profile — never your email address or phone number."
      >
        <form action={action} className="space-y-4">
          <input type="hidden" name="memberId" value={memberId} />

          <div>
            <label className="field-label" htmlFor="direct-body">
              Your message
            </label>
            <textarea
              id="direct-body"
              name="body"
              className="textarea min-h-32"
              placeholder={
                placeholder ??
                "Introduce yourself and say what you are looking for."
              }
              required
              minLength={10}
            />
            {state.errors?.body ? (
              <p className="field-error">{state.errors.body}</p>
            ) : null}
          </div>

          <FormMessage state={state} />

          <SubmitButton pending={pending}>Send message</SubmitButton>

          <p className="text-[0.6875rem] leading-relaxed text-[var(--color-ink-3)]">
            Keep the conversation on Buildora. Never share passwords, one-time
            codes or bank details, and be wary of anyone pushing you to pay
            before you have done your own checks.
          </p>
        </form>
      </Dialog>
    </>
  );
}
