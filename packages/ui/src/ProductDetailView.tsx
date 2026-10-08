import type { ReactNode } from "react";
import { MapPin, ShieldCheck, Star } from "lucide-react";
import type { Product } from "@repo/types";
import { ProductGallery } from "./ProductGallery";

interface ProductDetailViewProps {
  product: Product;
  /**
   *Cả hai app truyền <AddToCartButton variant="detail" /> từ @repo/ui
   */
  cartAction: ReactNode;
}

export function ProductDetailView({
  product,
  cartAction,
}: ProductDetailViewProps) {
  const hasDiscount = Boolean(product.discountPercent && product.originalPrice);
  const saved = hasDiscount ? product.originalPrice! - product.price : 0;
  const specs = product.specifications
    ? Object.entries(product.specifications)
    : [];
  const showFullDescriptionBlock =
    Boolean(product.shortDescription) && Boolean(product.description);

  return (
    <div className="pb-8">
      <div className="grid gap-6 rounded-card border border-border bg-background p-4 shadow-card sm:p-6 md:grid-cols-2 lg:gap-10 lg:p-8">
        <ProductGallery
          name={product.name}
          mainUrl={product.detailUrl}
          gallery={product.gallery ?? []}
        />

        <div className="flex flex-col">
          {product.brand && (
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">
              {product.brand}
            </p>
          )}

          <h1 className="mt-1 text-2xl font-bold leading-tight text-foreground lg:text-3xl">
            {product.name}
          </h1>

          {product.rating && (
            <div className="mt-2 flex flex-wrap items-center gap-x-2 text-sm text-muted">
              <Star
                className="h-4 w-4 fill-amber-400 text-amber-400"
                aria-hidden="true"
              />
              <span className="font-semibold text-foreground">
                {product.rating.average.toFixed(1)}
              </span>
              <span>({product.rating.count} đánh giá)</span>
              {typeof product.soldCount === "number" && (
                <span>· Đã bán {product.soldCount.toLocaleString("vi-VN")}</span>
              )}
            </div>
          )}

          <div className="mt-4 rounded-xl bg-surface p-4">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <p className="text-3xl font-bold text-foreground">
                {product.price.toLocaleString("vi-VN")}₫
              </p>
              {hasDiscount && (
                <>
                  <p className="text-base text-muted line-through">
                    {product.originalPrice!.toLocaleString("vi-VN")}₫
                  </p>
                  <span className="rounded-full bg-sale px-2 py-0.5 text-xs font-bold text-white">
                    -{product.discountPercent}%
                  </span>
                </>
              )}
              {product.unit && (
                <span className="text-sm text-muted">/ {product.unit}</span>
              )}
            </div>
            {hasDiscount && (
              <p className="mt-1 text-sm font-medium text-accent-dark">
                Tiết kiệm {saved.toLocaleString("vi-VN")}₫
              </p>
            )}
          </div>

          {typeof product.stock === "number" && (
            <p className="mt-3 flex items-center gap-2 text-sm">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${
                  product.stock === 0
                    ? "bg-sale"
                    : product.stock <= 10
                      ? "bg-amber-500"
                      : "bg-accent"
                }`}
              />
              <span className="text-muted">
                {product.stock === 0
                  ? "Tạm hết hàng"
                  : product.stock <= 10
                    ? `Chỉ còn ${product.stock} sản phẩm`
                    : `Còn ${product.stock} sản phẩm`}
              </span>
            </p>
          )}

          <p className="mt-4 leading-relaxed text-muted">
            {product.shortDescription ?? product.description}
          </p>

          <div className="mt-6">{cartAction}</div>

          {(product.warranty || product.origin) && (
            <dl className="mt-6 grid gap-3 sm:grid-cols-2">
              {product.warranty && (
                <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                  <ShieldCheck
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-xs text-muted">Bảo hành</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {product.warranty}
                    </dd>
                  </div>
                </div>
              )}
              {product.origin && (
                <div className="flex items-start gap-2.5 rounded-xl border border-border p-3">
                  <MapPin
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                    aria-hidden="true"
                  />
                  <div>
                    <dt className="text-xs text-muted">Xuất xứ</dt>
                    <dd className="text-sm font-medium text-foreground">
                      {product.origin}
                    </dd>
                  </div>
                </div>
              )}
            </dl>
          )}

          {product.tags && product.tags.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {product.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-surface px-3 py-1 text-xs text-muted"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {(specs.length > 0 || showFullDescriptionBlock) && (
        <div className="mt-6 space-y-6">
          {specs.length > 0 && (
            <section className="rounded-card border border-border bg-background p-5 shadow-card sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-foreground">
                Thông số kỹ thuật
              </h2>
              <dl className="overflow-hidden rounded-xl border border-border text-sm">
                {specs.map(([label, value]) => (
                  <div
                    key={label}
                    className="grid grid-cols-[2fr_3fr] gap-4 px-4 py-2.5 odd:bg-surface"
                  >
                    <dt className="text-muted">{label}</dt>
                    <dd className="text-foreground">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          {showFullDescriptionBlock && (
            <section className="rounded-card border border-border bg-background p-5 shadow-card sm:p-6">
              <h2 className="mb-3 text-lg font-bold text-foreground">
                Mô tả sản phẩm
              </h2>
              <p className="whitespace-pre-line leading-relaxed text-muted">
                {product.description}
              </p>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
