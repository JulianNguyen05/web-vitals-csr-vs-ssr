"use client";

import Link from "next/link";
import { useCartStore } from "@repo/cart-store";
import { useEffect, useState } from "react";

export function Nav() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex items-center justify-between bg-background shadow-sm rounded-card px-6 py-3 mt-4 mb-6">
      <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
        <span className="w-6 h-6 rounded-md bg-accent text-white text-xs flex items-center justify-center">
          T
        </span>
        T&amp;Q Mart (SSR)
      </Link>
      <Link href="/cart" className="text-sm text-accent hover:text-accent-dark">
        Giỏ hàng ({mounted ? totalQuantity : 0})
      </Link>
    </header>
  );
}
