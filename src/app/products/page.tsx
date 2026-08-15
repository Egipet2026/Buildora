import { BrowsePage, type SearchParams } from "@/components/browse";

export const metadata = { title: "Products & Suppliers" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <BrowsePage
      kind="product"
      eyebrow="Products & suppliers"
      title="Source products and manufacturing"
      description="Manufacturers, wholesalers, private-label producers, packaging and logistics partners across Europe and beyond."
      searchParams={await searchParams}
      basePath="/products"
    />
  );
}
