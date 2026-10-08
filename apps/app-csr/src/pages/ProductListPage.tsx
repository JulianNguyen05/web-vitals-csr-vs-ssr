import { ProductCard, ProductGrid, AddToCartButton } from "@repo/ui";
import { products } from "@repo/data";
import { Link } from "react-router-dom";

export function ProductListPage() {
  return (
    <ProductGrid count={products.length}>
      {products.map((p) => (
        <Link key={p.id} to={`/products/${p.id}`} className="block h-full">
          <ProductCard product={p} actions={<AddToCartButton productId={p.id} />} />
        </Link>
      ))}
    </ProductGrid>
  );
}
