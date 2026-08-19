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
        Keep negotiations on Buildora. Never share bank details, passwords or
        one-time codes in a message.
      </p>
    </form>
  );
}

/** How often the demo fallback checks for the other side's messages. */
const POLL_MS = 4000;

/**
 * Keeps an open conversation live.
 *
 * With Supabase configured this is a realtime subscription on inserts. Without
 * it there is nothing to subscribe to, so it falls back to polling the server
 * component tree — only while the tab is actually visible, so a forgotten tab
 * costs nothing.
 */
export function RealtimeMessages({ conversationId }: { conversationId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = getBrowserSupabase();

    if (!supabase) {
      let timer: ReturnType<typeof setInterval> | undefined;

      const start = () => {
        if (timer) return;
        timer = setInterval(() => router.refresh(), POLL_MS);
      };
      const stop = () => {
        if (timer) clearInterval(timer);
        timer = undefined;
      };
      const onVisibility = () => {
        if (document.visibilityState === "visible") {
          router.refresh();
          start();
        } else {
          stop();
        }
      };

      onVisibility();
      document.addEventListener("visibilitychange", onVisibility);
      return () => {
        stop();
        document.removeEventListener("visibilitychange", onVisibility);
      };
    }

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

/**
 * Pins the thread to the newest message.
 *
 * `count` changes whenever a message arrives, which is what re-runs the
 * effect — the server component above owns the list itself.
 */
export function ScrollToLatest({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollIntoView({ block: "end" });
  }, [count]);

  return <div ref={ref} aria-hidden />;
}
