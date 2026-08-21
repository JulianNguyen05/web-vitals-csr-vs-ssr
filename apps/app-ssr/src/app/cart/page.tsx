"use client";

import productsData from "@repo/data/json/products-20.json";
import { CartDrawer } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import type { Product } from "@repo/types";
import { useEffect, useState } from "react";

const products = productsData as Product[];

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const total = selectCartTotal(items, products);

  if (!mounted) return <div className="p-4">Đang tải giỏ hàng...</div>;

  return (
    <div className="p-4">
      <CartDrawer
        items={items}
        products={products}
        total={total}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
        onClose={() => {}}
      />
    </div>
  );
}