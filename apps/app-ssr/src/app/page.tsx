import { ProductListView } from "@repo/ui";
import { categories, categoryHref, getListing, products } from "@repo/data";
import { NextLinkAdapter } from "./next-link-adapter";

export const dynamic = "force-dynamic";

export default function ProductListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const raw = searchParams.category;
  const listing = getListing(products, categories, Array.isArray(raw) ? raw[0] : raw);

  return (
    <ProductListView
      items={listing.items}
      categories={categories}
      activeCategory={listing.category}
      unknownCategory={listing.unknownCategory}
      categoryHref={categoryHref}
      LinkComponent={NextLinkAdapter}
    />
  );
}
