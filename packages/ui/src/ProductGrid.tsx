import type { ReactNode } from "react";

interface ProductGridProps {
  title?: string;
  count?: number;
  children: ReactNode;
}

export function ProductGrid({
  title = "Tất cả sản phẩm",
  count,
  children,
}: ProductGridProps) {
  return (
    <section aria-labelledby="product-grid-title" className="pb-8">
      <div className="mb-5 flex items-baseline justify-between gap-4">
        <h1
          id="product-grid-title"
          className="text-xl font-bold text-foreground sm:text-2xl"
        >
          {title}
        </h1>
        {typeof count === "number" && (
          <p className="text-sm text-muted">
            {count.toLocaleString("vi-VN")} sản phẩm
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5 xl:grid-cols-5">
        {children}
      </div>
    </section>
  );
}
