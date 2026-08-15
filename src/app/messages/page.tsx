import Link from "next/link";
import { redirect } from "next/navigation";
import { Cover, EmptyState, PageHeader } from "@/components/ui";
import { getConversationViews, getCurrentUser } from "@/lib/data";
import { timeAgo } from "@/lib/money";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const conversations = await getConversationViews(me.id);

  return (
    <>
      <PageHeader
        eyebrow="Inbox"
        title="Messages"
        description="Every conversation with a buyer or seller. Contact details stay private — nothing leaves the platform unless you send it."
      />

      <div className="shell py-10">
        {conversations.length ? (
          <div className="card divide-y divide-[var(--color-line)] overflow-hidden">
            {conversations.map((view) => (
              <Link
                key={view.conversation.id}
                href={`/messages/${view.conversation.id}`}
                className="flex items-start gap-4 p-5 transition-colors hover:bg-[var(--color-surface-2)]"
              >
                <Cover
                  seed={view.other.id}
                  label={view.other.full_name}
                  size="sm"
                  className="h-10 w-10 shrink-0 rounded-full"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="truncate font-semibold">
                      {view.other.full_name}
                      {view.other.is_verified ? (
                        <span
                          className="ml-1.5 text-[var(--color-accent)]"
                          title="Verified member"
                        >
                          ✓
                        </span>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-3)]">
                      {timeAgo(view.conversation.last_message_at)}
                    </span>
                  </div>

                  {view.listing ? (
                    <p className="mt-0.5 truncate text-[0.75rem] text-[var(--color-brand)]">
                      {view.listing.title}
                    </p>
                  ) : null}

                  <p className="mt-1.5 line-clamp-1 text-[0.875rem] text-[var(--color-ink-3)]">
                    {view.lastMessage?.sender_id === me.id ? "You: " : ""}
                    {view.lastMessage?.body ?? "No messages yet"}
                  </p>
                </div>

                {view.unreadCount > 0 ? (
                  <span className="mt-1 flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand)] px-1.5 text-[0.6875rem] font-bold text-white">
                    {view.unreadCount}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            icon="✉"
            title="No conversations yet"
            description="When you contact a seller — or a buyer contacts you — the conversation appears here."
            action={{ href: "/marketplace", label: "Browse the marketplace" }}
          />
        )}
      </div>
    </>
  );
}
