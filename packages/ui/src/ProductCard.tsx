import type { ReactNode } from "react";
import type { Product } from "@repo/types";

interface ProductCardProps {
  product: Product;
  onAddToCart?: (productId: string) => void;
  actions?: ReactNode;
}

export function ProductCard({ product, onAddToCart, actions }: ProductCardProps) {
  return (
    <div className="border border-border rounded-card overflow-hidden flex flex-col bg-background">
      <img
        src={product.thumbUrl}
        alt={product.name}
        width={400}
        height={400}
        loading="lazy"
        className="w-full aspect-square object-cover bg-surface"
      />
      <div className="p-3 flex flex-col gap-2 flex-1">
        <h3 className="text-sm font-medium line-clamp-2 text-foreground">{product.name}</h3>
        <p className="text-base font-semibold mt-auto text-foreground">
          {product.price.toLocaleString("vi-VN")}₫
        </p>
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
