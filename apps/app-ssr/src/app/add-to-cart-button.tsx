"use client";

import { useCartStore } from "@repo/cart-store";

export function AddToCartButton({ productId }: { productId: string }) {
  const addItem = useCartStore((s) => s.addItem);
  return (
    <button
      onClick={() => addItem(productId)}
      className="w-full text-sm bg-blue-600 text-white rounded-md py-1.5 hover:bg-blue-700 mt-2"
    >
      Thêm vào giỏ
    </button>
  );
}