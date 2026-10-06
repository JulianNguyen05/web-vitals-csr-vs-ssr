"use client";

import { CartPageView } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import { products } from "@repo/data";
import { useEffect, useState } from "react";
import { NextLinkAdapter } from "../next-link-adapter";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const total = selectCartTotal(items, products);

  if (!mounted) return <div className="p-4">Đang tải giỏ hàng...</div>;

  return (
    <CartPageView
      items={items}
      products={products}
      total={total}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      LinkComponent={NextLinkAdapter}
    />
  );
}