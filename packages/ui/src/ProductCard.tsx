import type { ReactNode } from "react";
import type { Product } from "@repo/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  actions?: ReactNode;
}

export function ProductCard({ product, onAddToCart, actions }: ProductCardProps) {
  const hasDiscount = Boolean(product.discountPercent && product.originalPrice);

  return (
    <div className="bg-background rounded-card overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
      <div className="relative">
        <img
          src={product.thumbUrl}
          alt={product.name}
          width={400}
          height={400}
          loading="lazy"
          className="w-full aspect-square object-cover bg-surface"
        />
        {hasDiscount && (
          <span className="absolute top-2 left-2 text-xs font-semibold bg-accent text-white rounded px-1.5 py-0.5">
            -{product.discountPercent}%
          </span>
        )}
      </div>
      <div className="p-3 flex flex-col gap-1 flex-1">
        {product.brand && (
          <span className="text-xs text-muted uppercase tracking-wide">{product.brand}</span>
        )}
        <h3 className="text-sm font-medium line-clamp-2 text-foreground">{product.name}</h3>
        {product.rating && (
          <div className="flex items-center gap-1 text-xs text-muted">
            <span className="text-amber-500">★ {product.rating.average.toFixed(1)}</span>
            <span>({product.rating.count})</span>
            {typeof product.soldCount === "number" && (
              <span>· Đã bán {product.soldCount.toLocaleString("vi-VN")}</span>
            )}
          </div>
        )}
        <div className="flex items-baseline gap-1.5 mt-auto">
          <p className="text-base font-semibold text-foreground">
            {product.price.toLocaleString("vi-VN")}₫
          </p>
          {hasDiscount && (
            <p className="text-xs text-muted line-through">
              {product.originalPrice!.toLocaleString("vi-VN")}₫
            </p>
          )}
        </div>
        {actions ? (
          actions
        ) : (
          onAddToCart && (
            <button
              onClick={() => onAddToCart(product.id)}
              className="text-sm bg-accent text-white rounded-md py-1.5 hover:bg-accent-dark transition-colors"
            >
              Thêm vào giỏ
            </button>
          )
        )}
      </div>
    </div>
  );
}
