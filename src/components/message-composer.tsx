"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef } from "react";
import {
  sendMessageAction,
} from "@/lib/actions";
import { IDLE } from "@/lib/action-state";
import { getBrowserSupabase } from "@/lib/supabase/client";

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  const [state, action, pending] = useActionState(sendMessageAction, IDLE);
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form
      ref={formRef}
      action={action}
      className="border-t border-[var(--color-line)] bg-[var(--color-surface)] p-4"
    >
      <input type="hidden" name="conversationId" value={conversationId} />
      <div className="flex items-end gap-2.5">
        <textarea
          name="body"
          className="textarea min-h-[3rem] flex-1 !py-2.5"
          rows={2}
          placeholder="Write a message…"
          aria-label="Message"
          required
          onKeyDown={(e) => {
            // Enter sends; Shift+Enter inserts a newline.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <button type="submit" className="btn btn-brand" disabled={pending}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
      {state.errors?.body ? (
        <p className="field-error">{state.errors.body}</p>
      ) : null}
      <p className="mt-2 text-[0.6875rem] text-[var(--color-ink-3)]">
        Keep negotiations on BizHub. Never share bank details, passwords or
        one-time codes in a message.
      </p>
    </form>
  );
}

/**
 * Subscribes to inserts on this conversation and refreshes the server
 * component tree so new messages appear without a reload. No-op in demo mode.
 */
export function RealtimeMessages({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();
    if (!supabase) return;

    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [conversationId, router]);

  return null;
}
