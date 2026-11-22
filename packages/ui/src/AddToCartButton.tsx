"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react";
import { useCartStore } from "@repo/cart-store";

interface AddToCartButtonProps {
  productId: string;
  /** "compact": nút nhỏ trong thẻ sản phẩm. "detail": nút lớn kèm bộ chọn số lượng. */
  variant?: "compact" | "detail";
}

export function AddToCartButton({
  productId,
  variant = "compact",
}: AddToCartButtonProps) {
  const addItem = useCartStore((s) => s.addItem);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const flash = () => {
    setAdded(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setAdded(false), 1500);
  };

  if (variant === "detail") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex h-12 items-center overflow-hidden rounded-xl border border-border">
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            aria-label="Giảm số lượng"
            className="flex h-full w-11 items-center justify-center text-foreground transition-colors hover:bg-surface"
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-10 text-center font-semibold text-foreground">
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(99, q + 1))}
            aria-label="Tăng số lượng"
            className="flex h-full w-11 items-center justify-center text-foreground transition-colors hover:bg-surface"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => {
            addItem(productId, quantity);
            flash();
          }}
          data-testid="add-to-cart"
          className="flex h-12 min-w-[200px] flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-6 font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          {added ? (
            <>
              <Check className="h-5 w-5" /> Đã thêm vào giỏ
            </>
          ) : (
            <>
              <ShoppingCart className="h-5 w-5" /> Thêm vào giỏ hàng
            </>
          )}
        </button>
      </div>
    );
  }

  const handleClick = () => {
    addItem(productId);
    flash();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      data-testid="add-to-cart"
      className={`flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${
        added
          ? "bg-accent text-white"
          : "bg-accent-light text-accent-dark hover:bg-accent hover:text-white"
      }`}
    >
      {added ? (
        <>
          <Check className="h-4 w-4" /> Đã thêm
        </>
      ) : (
        <>
          <ShoppingCart className="h-4 w-4" /> Thêm vào giỏ
        </>
      )}
    </button>
  );
}
