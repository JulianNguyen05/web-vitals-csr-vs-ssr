import productsData from "@repo/data/json/products-20.json";
import { ProductCard } from "@repo/ui";
import type { Product } from "@repo/types";
import Link from "next/link";
import { AddToCartButton } from "./add-to-cart-button";

export const dynamic = "force-dynamic";

const products = productsData as Product[];

export default function CategoryPage() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-6 pb-8">
      {products.map((p) => (
        <Link key={p.id} href={`/products/${p.id}`}>
          <ProductCard product={p} actions={<AddToCartButton productId={p.id} />} />
        </Link>
      ))}
    </div>
  );
}
