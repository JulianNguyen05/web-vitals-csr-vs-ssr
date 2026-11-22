import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function RouterLink({
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
      to={href}
      // "none": không gắn data-discover="true" (chỉ dùng cho framework mode của React Router),
      // giữ HTML thẻ <a> giống hệt next/link ở bản SSR.
      discover="none"
      className={className}
      aria-label={ariaLabel}
      aria-current={ariaCurrent}
    >
      {children}
    </Link>
  );
}
