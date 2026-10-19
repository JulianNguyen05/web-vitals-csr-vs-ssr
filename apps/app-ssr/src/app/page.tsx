import { ProductCard, ProductGrid, AddToCartButton } from "@repo/ui";
import { products } from "@repo/data";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function ProductListPage() {
  return (
    <ProductGrid count={products.length}>
      {products.map((p, i) => (
        <Link
          key={p.id}
          href={`/products/${p.id}`}
          prefetch={false}
          className="block h-full"
        >
          <ProductCard
            product={p}
            priority={i < 8}
            actions={<AddToCartButton productId={p.id} />}
          />
        </Link>
      ))}
    </ProductGrid>
  );
}