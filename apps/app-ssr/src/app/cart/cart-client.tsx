"use client";

import { useEffect, useState } from "react";
import type { CartProduct } from "@repo/types";
import { CartPageView } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import { NextLinkAdapter } from "../next-link-adapter";

export function CartClient({ catalog }: { catalog: CartProduct[] }) {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const total = selectCartTotal(items, catalog);

  if (!mounted) return <div className="p-4">Đang tải giỏ hàng...</div>;

  return (
    <CartPageView
      items={items}
      products={catalog}
      total={total}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      LinkComponent={NextLinkAdapter}
    />
  );
}
