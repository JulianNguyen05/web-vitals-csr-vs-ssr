import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function RouterLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link to={href} className={className}>
      {children}
    </Link>
  );
}