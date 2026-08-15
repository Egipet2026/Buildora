import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { markAllNotificationsReadAction } from "@/lib/actions";
import { getCurrentUser, getNotifications } from "@/lib/data";
import { timeAgo } from "@/lib/money";
import type { NotificationType } from "@/lib/types";

export const metadata = { title: "Notifications" };

const ICON: Record<NotificationType, string> = {
  offer_received: "⇄",
  offer_countered: "⇄",
  offer_accepted: "✓",
  offer_rejected: "×",
  message_received: "✉",
  listing_approved: "✓",
  listing_rejected: "×",
  price_changed: "↓",
  saved_listing_update: "★",
  new_match: "◍",
};

export default async function NotificationsPage() {
  const me = (await getCurrentUser())!;
  const notifications = await getNotifications(me.id);
  const unread = notifications.filter((n) => !n.is_read).length;

  if (!notifications.length) {
    return (
      <EmptyState
        icon="◔"
        title="No notifications"
        description="Offers, counter-offers, messages, listing decisions and new matches for your searches all land here."
      />
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center justify-between">
        <p className="text-[0.875rem] text-[var(--color-ink-2)]">
          {unread ? `${unread} unread` : "All caught up"}
        </p>
        {unread ? (
          <form action={markAllNotificationsReadAction}>
            <button type="submit" className="btn btn-outline btn-sm">
              Mark all as read
            </button>
          </form>
        ) : null}
      </div>

      <div className="card divide-y divide-[var(--color-line)]">
        {notifications.map((n) => {
          const body = (
            <div className="flex items-start gap-4 p-5">
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[0.875rem] ${
                  n.is_read
                    ? "bg-[var(--color-surface-2)] text-[var(--color-ink-3)]"
                    : "bg-[var(--color-brand-tint)] text-[var(--color-brand)]"
                }`}
                aria-hidden
              >
                {ICON[n.type] ?? "•"}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={`text-[0.9375rem] ${n.is_read ? "font-medium" : "font-semibold"}`}
                >
                  {n.title}
                </p>
                <p className="mt-0.5 text-[0.875rem] leading-relaxed text-[var(--color-ink-3)]">
                  {n.body}
                </p>
              </div>
              <span className="shrink-0 text-[0.75rem] text-[var(--color-ink-3)]">
                {timeAgo(n.created_at)}
              </span>
            </div>
          );

          return n.link ? (
            <Link
              key={n.id}
              href={n.link}
              className="block transition-colors hover:bg-[var(--color-surface-2)]"
            >
              {body}
            </Link>
          ) : (
            <div key={n.id}>{body}</div>
          );
        })}
      </div>
    </div>
  );
}
