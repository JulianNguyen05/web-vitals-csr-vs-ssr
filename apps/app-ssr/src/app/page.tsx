import { ProductCard, ProductGrid, AddToCartButton } from "@repo/ui";
import { products } from "@repo/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ProductListPage() {
  return (
    <ProductGrid count={products.length}>
      {products.map((p) => (
        <Link key={p.id} href={`/products/${p.id}`} className="block h-full">
          <ProductCard product={p} actions={<AddToCartButton productId={p.id} />} />
        </Link>
      ))}
    </ProductGrid>
  );
}
