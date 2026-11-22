import { useSearchParams } from "react-router-dom";
import { ProductListView } from "@repo/ui";
import { categories, categoryHref, getListing, products } from "@repo/data";
import { RouterLink } from "../components/RouterLink";

export function ProductListPage() {
  const [params] = useSearchParams();
  const listing = getListing(products, categories, params.get("category"));

  return (
    <ProductListView
      items={listing.items}
      categories={categories}
      activeCategory={listing.category}
      unknownCategory={listing.unknownCategory}
      categoryHref={categoryHref}
      LinkComponent={RouterLink}
    />
  );
}
