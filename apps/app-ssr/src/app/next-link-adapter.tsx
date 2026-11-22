import Link from "next/link";
import type { ReactNode } from "react";

export function NextLinkAdapter({
  href,
  className,
  children,
  "aria-label": ariaLabel,
  "aria-current": ariaCurrent,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  "aria-label"?: string;
  "aria-current"?: "page" | undefined;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}
