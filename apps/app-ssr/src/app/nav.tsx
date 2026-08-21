"use client";

import Link from "next/link";
import { useCartStore } from "@repo/cart-store";
import { useEffect, useState } from "react";

export function Nav() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <header className="flex items-center justify-between p-4 border-b">
      <Link href="/" className="font-bold">T&Q Mart (SSR)</Link>
      <Link href="/cart">Giỏ hàng ({mounted ? totalQuantity : 0})</Link>
    </header>
  );
}