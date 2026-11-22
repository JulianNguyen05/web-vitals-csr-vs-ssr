import type { ReactNode } from "react";
import { Star } from "lucide-react";
import type { Product } from "@repo/types";
import type { LinkComponentType } from "./types";

interface ProductCardProps {
  product: Product;
  /** Đường dẫn trang chi tiết. */
  href: string;
  LinkComponent: LinkComponentType;
  /** Nút thao tác (Thêm vào giỏ). Đặt NGOÀI thẻ link để HTML hợp lệ (không lồng <button> trong <a>). */
  actions?: ReactNode;
  /** true = ảnh nằm trong khung nhìn đầu tiên → tải ngay (eager), còn lại lazy. */
  priority?: boolean;
}

export function ProductCard({
  product,
  href,
  LinkComponent,
  actions,
  priority = false,
}: ProductCardProps) {
  const hasDiscount = Boolean(product.discountPercent && product.originalPrice);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-card border border-border bg-background shadow-card transition duration-200 hover:shadow-card-hover motion-safe:hover:-translate-y-0.5">
      <LinkComponent href={href} className="relative block overflow-hidden bg-surface">
        <img
          src={product.thumbUrl}
          alt={product.name}
          width={400}
          height={400}
          loading={priority ? "eager" : "lazy"}
          className="aspect-square w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
        />
        {hasDiscount && (
          <span className="absolute left-2.5 top-2.5 rounded-full bg-sale px-2 py-0.5 text-[11px] font-bold text-white">
            -{product.discountPercent}%
          </span>
        )}
      </LinkComponent>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.brand && (
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            {product.brand}
          </span>
        )}
        <h3 className="line-clamp-2 min-h-[2.5rem] text-sm font-medium leading-5 text-foreground">
          <LinkComponent href={href} className="transition-colors hover:text-accent">
            {product.name}
          </LinkComponent>
        </h3>

        {product.rating && (
          <div className="flex flex-wrap items-center gap-x-1 text-xs text-muted">
            <Star
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
              aria-hidden="true"
            />
            <span className="font-medium text-foreground">
              {product.rating.average.toFixed(1)}
            </span>
            <span>({product.rating.count})</span>
            {typeof product.soldCount === "number" && (
              <span>· Đã bán {product.soldCount.toLocaleString("vi-VN")}</span>
            )}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-1">
          <p className="text-lg font-bold text-accent-dark">
            {product.price.toLocaleString("vi-VN")}₫
          </p>
          {hasDiscount && (
            <p className="text-xs text-muted line-through">
              {product.originalPrice!.toLocaleString("vi-VN")}₫
            </p>
          )}
        </div>

        {actions && <div className="pt-2">{actions}</div>}
      </div>
    </article>
  );
}
