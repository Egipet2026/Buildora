import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { Notice, PageHeader } from "@/components/ui";
import { getAdminStats, getCurrentUser } from "@/lib/data";
import { canAdminister } from "@/lib/roles";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  // Authorisation is enforced again inside every admin server action, and by
  // RLS at the database layer — this check only controls what is rendered.
  if (!canAdminister(me.role)) {
    return (
      <div className="shell py-20">
        <div className="mx-auto max-w-lg">
          <Notice tone="danger" title="Administrator access required">
            This area is restricted to platform administrators. If you believe
            you should have access, contact the Buildora team.
          </Notice>
        </div>
      </div>
    );
  }

  const stats = await getAdminStats();

  return (
    <>
      <PageHeader
        eyebrow="Administration"
        title="Platform control"
        description="Moderate listings, manage members, resolve reports, review verification and set pricing."
      />

      <div className="shell py-8">
        <TabNav
          items={[
            { href: "/admin", label: "Overview" },
            {
              href: "/admin/listings",
              label: "Listings",
              count: stats.pendingListings,
            },
            { href: "/admin/users", label: "Members" },
            { href: "/admin/reports", label: "Reports", count: stats.openReports },
            {
              href: "/admin/verification",
              label: "Verification",
              count: stats.pendingVerifications,
            },
            { href: "/admin/transactions", label: "Transactions" },
            { href: "/admin/categories", label: "Categories" },
            { href: "/admin/settings", label: "Settings" },
          ]}
        />
        <div className="py-8">{children}</div>
      </div>
    </>
  );
}
