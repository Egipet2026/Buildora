import Link from "next/link";
import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { PageHeader } from "@/components/ui";
import {
  getCurrentUser,
  getFavoriteIds,
  getNotifications,
  getOfferThreads,
} from "@/lib/data";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [saved, offers, notifications] = await Promise.all([
    getFavoriteIds(me.id),
    getOfferThreads(me.id, "buyer"),
    getNotifications(me.id),
  ]);

  const openOffers = offers.filter((t) => t.latest.status === "pending").length;
  const unread = notifications.filter((n) => !n.is_read).length;

  return (
    <>
      <PageHeader
        eyebrow="Your profile"
        title={`Welcome back, ${me.full_name.split(" ")[0]}`}
        description="Everything you are tracking as a buyer — saved listings, live negotiations, purchases and alerts. Selling or building something starts here too."
      >
        {/* The browse pages are for browsing. Publishing anything — a listing
            or a business — happens from your own profile. */}
        <Link href="/sell" className="btn btn-primary">
          Post a listing
        </Link>
        <Link href="/workspace" className="btn btn-outline">
          My business
        </Link>
      </PageHeader>

      <div className="shell py-8">
        <TabNav
          items={[
            { href: "/dashboard", label: "Overview" },
            { href: "/dashboard/saved", label: "Saved", count: saved.length },
            { href: "/dashboard/offers", label: "Offers", count: openOffers },
            { href: "/dashboard/purchases", label: "Purchases" },
            {
              href: "/dashboard/notifications",
              label: "Notifications",
              count: unread,
            },
          ]}
        />
        <div className="py-8">{children}</div>
      </div>
    </>
  );
}
