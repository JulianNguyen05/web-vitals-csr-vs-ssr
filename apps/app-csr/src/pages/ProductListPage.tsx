import { ProductCard, AddToCartButton } from "@repo/ui";
import { products } from "@repo/data";
import { Link } from "react-router-dom";

export function ProductListPage() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-6 pb-8">
      {products.map((p) => (
        <Link key={p.id} to={`/products/${p.id}`}>
          <ProductCard product={p} actions={<AddToCartButton productId={p.id} />} />
        </Link>
      ))}
    </div>
  );
}