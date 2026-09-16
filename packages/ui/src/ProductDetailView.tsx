import type { ReactNode } from "react";
import type { Product } from "@repo/types";

interface ProductDetailViewProps {
  product: Product;
  /**
   * Nút "Thêm vào giỏ hàng" — mỗi app tự truyền vào (CSR dùng <Button> gọi
   * thẳng zustand store, SSR dùng client component riêng), nhưng phần
   * markup bao quanh (div.mt-4.max-w-xs) được render giống hệt nhau ở đây
   * để đảm bảo HTML/CSS đồng nhất 100% giữa hai phiên bản.
   */
  cartAction: ReactNode;
}

export function ProductDetailView({ product, cartAction }: ProductDetailViewProps) {
  const hasDiscount = Boolean(product.discountPercent && product.originalPrice);
  const gallery = product.gallery ?? [];
  const specs = product.specifications ? Object.entries(product.specifications) : [];
  const showFullDescriptionBlock = Boolean(product.shortDescription) && Boolean(product.description);

  return (
    <div className="p-4 flex flex-col md:flex-row gap-6">
      <div className="w-full md:w-96 flex flex-col gap-2">
        <img
          src={product.detailUrl}
          alt={product.name}
          width={800}
          height={800}
          className="w-full aspect-square object-cover rounded-lg bg-surface"
        />
        {gallery.length > 0 && (
          <div className="flex gap-2 overflow-x-auto">
            {gallery.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`${product.name} - ảnh ${i + 2}`}
                width={120}
                height={120}
                loading="lazy"
                className="w-20 h-20 object-cover rounded-md bg-surface shrink-0"
              />
            ))}
          </div>
        )}
      </div>

      <div className="flex-1">
        {product.brand && (
          <p className="text-sm text-muted uppercase tracking-wide">{product.brand}</p>
        )}

        <h1 className="text-xl font-semibold text-foreground">{product.name}</h1>

        {product.rating && (
          <div className="flex items-center gap-2 mt-1 text-sm text-muted">
            <span className="text-amber-500">★ {product.rating.average.toFixed(1)}</span>
            <span>({product.rating.count} đánh giá)</span>
            {typeof product.soldCount === "number" && (
              <span>· Đã bán {product.soldCount.toLocaleString("vi-VN")}</span>
            )}
          </div>
        )}

        <div className="flex items-baseline gap-2 mt-2 flex-wrap">
          <p className="text-lg font-bold text-foreground">
            {product.price.toLocaleString("vi-VN")}₫
          </p>
          {hasDiscount && (
            <>
              <p className="text-sm text-muted line-through">
                {product.originalPrice!.toLocaleString("vi-VN")}₫
              </p>
              <span className="text-xs font-medium bg-accent/10 text-accent rounded px-1.5 py-0.5">
                -{product.discountPercent}%
              </span>
            </>
          )}
          {product.unit && <span className="text-sm text-muted">/ {product.unit}</span>}
        </div>

        {typeof product.stock === "number" && (
          <p className="text-sm text-muted mt-1">
            {product.stock > 0 ? `Còn ${product.stock} sản phẩm` : "Tạm hết hàng"}
          </p>
        )}

        <p className="text-muted mt-4">{product.shortDescription ?? product.description}</p>

        <div className="mt-4 max-w-xs">{cartAction}</div>

        {specs.length > 0 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Thông số kỹ thuật</h2>
            <dl className="text-sm divide-y divide-border">
              {specs.map(([label, value]) => (
                <div key={label} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-muted">{label}</dt>
                  <dd className="text-foreground text-right">{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}

        {showFullDescriptionBlock && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold text-foreground mb-2">Mô tả chi tiết</h2>
            <p className="text-muted whitespace-pre-line">{product.description}</p>
          </div>
        )}

        {(product.origin || product.warranty) && (
          <dl className="text-sm mt-6 space-y-1">
            {product.origin && (
              <div className="flex gap-2">
                <dt className="text-muted">Xuất xứ:</dt>
                <dd className="text-foreground">{product.origin}</dd>
              </div>
            )}
            {product.warranty && (
              <div className="flex gap-2">
                <dt className="text-muted">Bảo hành:</dt>
                <dd className="text-foreground">{product.warranty}</dd>
              </div>
            )}
          </dl>
        )}

        {product.tags && product.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {product.tags.map((tag) => (
              <span key={tag} className="text-xs bg-surface text-muted rounded-full px-2.5 py-1">
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
