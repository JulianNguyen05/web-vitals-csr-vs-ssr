import Link from "next/link";
import type { ReactNode } from "react";

export function NextLinkAdapter({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  );
}