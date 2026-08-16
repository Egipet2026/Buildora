import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  MessageComposer,
  RealtimeMessages,
  ScrollToLatest,
} from "@/components/message-composer";
import { ReportButton } from "@/components/listing-actions";
import { Cover, Notice } from "@/components/ui";
import { markMessagesReadAction } from "@/lib/actions";
import { getConversationThread, getCurrentUser } from "@/lib/data";
import { formatDate, formatMoney, timeAgo } from "@/lib/money";

export const metadata = { title: "Conversation" };

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const thread = await getConversationThread(id, me.id);
  if (!thread) notFound();

  // Opening the thread marks the other side's messages as read.
  await markMessagesReadAction(id);

  const { view, messages } = thread;

  return (
    <div className="shell py-8">
      <Link
        href="/messages"
        className="mb-5 inline-block text-[0.8125rem] text-[var(--color-ink-3)] hover:text-[var(--color-ink)]"
      >
        ← All messages
      </Link>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="card flex min-w-0 flex-col overflow-hidden">
          <RealtimeMessages conversationId={id} />

          <header className="flex items-center gap-3.5 border-b border-[var(--color-line)] p-5">
            <Cover
              seed={view.other.id}
              label={view.other.full_name}
              size="sm"
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <p className="truncate font-semibold">
                <Link
                  href={`/members/${view.other.id}`}
                  className="hover:text-[var(--color-brand)]"
                >
                  {view.other.full_name}
                </Link>
                {view.other.is_verified ? (
                  <span className="ml-1.5 text-[var(--color-accent)]" title="Verified">
                    ✓
                  </span>
                ) : null}
              </p>
              <p className="truncate text-[0.75rem] text-[var(--color-ink-3)]">
                {view.other.headline ?? "BizHub member"}
              </p>
            </div>
          </header>

          <div className="flex max-h-[60vh] min-h-80 flex-col gap-4 overflow-y-auto p-5">
            {messages.length === 0 ? (
              <p className="m-auto max-w-xs text-center text-[0.875rem] text-[var(--color-ink-3)]">
                No messages yet. Say hello.
              </p>
            ) : null}
            {messages.map((message) => {
              const mine = message.sender_id === me.id;
              return (
                <div
                  key={message.id}
                  className={`flex ${mine ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[80%]">
                    <div
                      className={`rounded-2xl px-4 py-2.5 text-[0.875rem] leading-relaxed ${
                        mine
                          ? "rounded-br-md bg-[var(--color-ink)] text-white"
                          : "rounded-bl-md bg-[var(--color-surface-2)] text-[var(--color-ink)]"
                      }`}
                    >
                      {message.body}
                    </div>
                    <p
                      className={`mt-1 text-[0.6875rem] text-[var(--color-ink-3)] ${
                        mine ? "text-right" : ""
                      }`}
                    >
                      {timeAgo(message.created_at)}
                      {mine && message.read_at ? " · Read" : ""}
                    </p>
                  </div>
                </div>
              );
            })}
            <ScrollToLatest count={messages.length} />
          </div>

          <MessageComposer conversationId={id} />
        </div>

        <aside className="space-y-5">
          {view.listing ? (
            <div className="card overflow-hidden">
              <Cover
                seed={view.listing.id}
                label={view.listing.title}
                className="h-24 w-full"
              />
              <div className="p-5">
                <p className="eyebrow mb-2">About</p>
                <Link
                  href={`/listing/${view.listing.id}`}
                  className="font-semibold leading-snug hover:text-[var(--color-brand)]"
                >
                  {view.listing.title}
                </Link>
                <p className="display mt-3 text-xl">
                  {view.listing.price_cents
                    ? formatMoney(view.listing.price_cents, view.listing.currency)
                    : "Open to offers"}
                </p>
                <Link
                  href={`/listing/${view.listing.id}`}
                  className="btn btn-outline btn-sm mt-4 w-full"
                >
                  View listing
                </Link>
              </div>
            </div>
          ) : null}

          <div className="card p-5">
            <p className="eyebrow mb-3">Member</p>
            <dl className="space-y-2 text-[0.8125rem]">
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Country</dt>
                <dd>{view.other.country ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Member since</dt>
                <dd>{formatDate(view.other.created_at)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-ink-3)]">Verified</dt>
                <dd>{view.other.is_verified ? "Yes" : "No"}</dd>
              </div>
            </dl>
            <Link
              href={`/members/${view.other.id}`}
              className="btn btn-outline btn-sm mt-4 w-full"
            >
              View their profile
            </Link>
            <div className="mt-4 hairline pt-4">
              <ReportButton
                targetType="user"
                targetId={view.other.id}
                label="Report this member"
              />
            </div>
          </div>

          <Notice tone="neutral" title="Stay safe">
            BizHub never asks for your password or payment details in a message.
            Be wary of anyone pushing you to move the conversation off-platform,
            to pay a deposit before due diligence, or to act urgently.
          </Notice>
        </aside>
      </div>
    </div>
  );
}
