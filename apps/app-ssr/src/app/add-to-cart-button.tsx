"use client";

import { useCartStore } from "@repo/cart-store";

export function AddToCartButton({ productId }: { productId: string }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      onClick={() => addItem(productId)}
      className="w-full text-sm bg-accent text-white rounded-md py-1.5 hover:bg-accent-dark transition-colors"
    >
      Thêm vào giỏ
    </button>
  );
}
