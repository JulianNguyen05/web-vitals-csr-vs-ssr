"use client";

import { useCartStore } from "@repo/cart-store";
import { useEffect, useState } from "react";
import { SiteHeader } from "@repo/ui";
import { NextLinkAdapter } from "./next-link-adapter";

export function Nav() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <SiteHeader
      storeLabel="T&Q Mart (SSR)"
      cartQuantity={mounted ? totalQuantity : 0}
      LinkComponent={NextLinkAdapter}
    />
  );
}
