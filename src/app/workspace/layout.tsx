import Link from "next/link";
import { redirect } from "next/navigation";
import { TabNav } from "@/components/tab-nav";
import { Notice, PageHeader } from "@/components/ui";
import {
  getBusinessProducts,
  getCurrentUser,
  getMilestones,
  getMyBusiness,
} from "@/lib/data";

/**
 * The owner-facing side of a business.
 *
 * Everything under here writes to one business — the caller's own — so the
 * layout resolves it once and the pages never take a business id from the URL.
 */
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);

  if (!business) {
    return (
      <>
        <PageHeader
          eyebrow="Your business"
          title="Build your business here"
          description="Create the business first. Then add what you sell, publish a storefront, and work through your build plan — all inside Buildora."
        />
        <div className="shell py-10">
          <div className="card p-8 text-center lg:p-12">
            <span className="text-3xl" aria-hidden>
              🏗
            </span>
            <h2 className="display mt-4 text-2xl">
              You have not set up a business yet
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-[0.9375rem] leading-relaxed text-[var(--color-ink-2)]">
              A business on Buildora is a working thing, not a description. It
              gets a public storefront with real products and prices, a build
              plan you tick off, and a direct line to partners, suppliers and
              customers already on the platform.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link href="/business-profiles/new" className="btn btn-brand btn-lg">
                Set up my business
              </Link>
            </div>
          </div>

          <div className="mt-8">
            <Notice tone="neutral" title="What you can do here afterwards">
              Publish products and services with prices and stock, keep a build
              plan you can tick off, take enquiries in your Buildora inbox, and
              list the business for sale later if you choose to. Buildora does not
              process payments for storefront products — buyers contact you and
              you agree terms directly.
            </Notice>
          </div>
        </div>
      </>
    );
  }

  const [products, milestones] = await Promise.all([
    getBusinessProducts(business.id, { includeDrafts: true }),
    getMilestones(business.id),
  ]);

  const openSteps = milestones.filter((m) => !m.is_done).length;

  return (
    <>
      <PageHeader
        eyebrow="Your business"
        title={business.name}
        description={business.description}
      >
        <Link
          href={`/business-profiles/${business.slug}`}
          className="btn btn-outline"
        >
          View public storefront
        </Link>
        <Link href="/sell" className="btn btn-primary">
          Post a listing
        </Link>
      </PageHeader>

      <div className="shell py-8">
        <TabNav
          items={[
            { href: "/workspace", label: "Overview" },
            {
              href: "/workspace/products",
              label: "Products & services",
              count: products.length,
            },
            {
              href: "/workspace/plan",
              label: "Build plan",
              count: openSteps,
            },
            { href: "/workspace/goals", label: "Goals" },
            { href: "/workspace/metrics", label: "Dashboard" },
          ]}
        />
        <div className="py-8">{children}</div>
      </div>
    </>
  );
}
