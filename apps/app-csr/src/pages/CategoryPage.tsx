import { useState } from "react";
import productsData from "@repo/data/json/products-20.json";
import { ProductCard } from "@repo/ui";
import { useCartStore } from "@repo/cart-store";
import type { Product } from "@repo/types";
import { Link } from "react-router-dom";

const products = productsData as Product[];

export function CategoryPage() {
  const addItem = useCartStore((s) => s.addItem);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5 md:gap-6 pb-8">
      {products.map((p) => (
        <Link key={p.id} to={`/products/${p.id}`}>
          <ProductCard product={p} onAddToCart={() => addItem(p.id)} />
        </Link>
      ))}
    </div>
  );
}
