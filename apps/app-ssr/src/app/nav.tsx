"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { useCartStore } from "@repo/cart-store";
import { useEffect, useState } from "react";
import { SiteHeader } from "@repo/ui";

function NextLinkAdapter({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className}>
      {children}
    </Link>
  );
}

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
