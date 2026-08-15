import Link from "next/link";
import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { PageHeader } from "@/components/ui";
import { getCurrentUser, getOfferThreads, getSellerStats } from "@/lib/data";

export default async function SellerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const [stats, offers] = await Promise.all([
    getSellerStats(me.id),
    getOfferThreads(me.id, "seller"),
  ]);
  const openOffers = offers.filter((t) => t.latest.status === "pending").length;

  return (
    <>
      <PageHeader
        eyebrow="Seller dashboard"
        title="Your listings and deals"
        description="Track performance, respond to offers, request verification and promote what you are selling."
      >
        <Link href="/sell" className="btn btn-brand">
          New listing
        </Link>
      </PageHeader>

      <div className="shell py-8">
        <TabNav
          items={[
            { href: "/seller", label: "Overview" },
            {
              href: "/seller/listings",
              label: "My listings",
              count: stats.active + stats.pending,
            },
            { href: "/seller/offers", label: "Offers", count: openOffers },
            { href: "/seller/analytics", label: "Analytics" },
            { href: "/seller/promotions", label: "Featured & Boost" },
            { href: "/seller/verification", label: "Verification" },
          ]}
        />
        <div className="py-8">{children}</div>
      </div>
    </>
  );
}
