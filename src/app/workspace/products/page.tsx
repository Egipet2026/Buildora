import { redirect } from "next/navigation";
import { ProductManager } from "@/components/product-manager";
import { Notice } from "@/components/ui";
import {
  getBusinessProducts,
  getCurrentUser,
  getMyBusiness,
} from "@/lib/data";

export const metadata = { title: "Products & services" };

export default async function WorkspaceProductsPage() {
  const me = await getCurrentUser();
  if (!me) redirect("/login");

  const business = await getMyBusiness(me.id);
  if (!business) return null;

  const products = await getBusinessProducts(business.id, {
    includeDrafts: true,
  });

  return (
    <div className="space-y-8">
      <ProductManager products={products} />

      <Notice tone="neutral" title="Describing what you sell">
        Say what is included, what it costs and how it is delivered. Do not
        promise outcomes you cannot control, and do not describe something as
        certified, patented or approved unless it is — those claims are checked
        when you apply for verification, and members can report a page that
        misleads them.
      </Notice>
    </div>
  );
}
