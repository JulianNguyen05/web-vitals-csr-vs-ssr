import type { Category, Product } from "@repo/types";
import { PackageOpen } from "lucide-react";
import { AddToCartButton } from "./AddToCartButton";
import { ProductCard } from "./ProductCard";
import { ProductGrid } from "./ProductGrid";
import type { LinkComponentType } from "./types";

/** Số ảnh đầu danh sách được tải ngay (eager) — đủ phủ khung nhìn đầu ở mọi breakpoint. */
export const EAGER_IMAGE_COUNT = 8;

interface ProductListViewProps {
  items: Product[];
  categories: Category[];
  activeCategory: Category | null;
  unknownCategory: boolean;
  /** Hàm dựng href theo ngành hàng (dùng categoryHref của @repo/data). */
  categoryHref: (slug: string | null) => string;
  LinkComponent: LinkComponentType;
}

/**
 * Trang danh mục sản phẩm (UC01) — markup duy nhất cho cả CSR và SSR.
 * Hai app chỉ khác nhau ở chỗ đọc query (trình duyệt vs server) và LinkComponent.
 */
export function ProductListView({
  items,
  categories,
  activeCategory,
  unknownCategory,
  categoryHref,
  LinkComponent,
}: ProductListViewProps) {
  const chip = (active: boolean) =>
    `block whitespace-nowrap rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
      active
        ? "border-accent bg-accent text-white"
        : "border-border bg-background text-foreground hover:border-accent hover:text-accent"
    }`;

  return (
    <div>
      <nav aria-label="Ngành hàng" className="-mx-4 mb-5 overflow-x-auto px-4 sm:-mx-6 sm:px-6">
        <ul className="flex gap-2 pb-1">
          <li className="shrink-0">
            <LinkComponent
              href={categoryHref(null)}
              className={chip(!activeCategory && !unknownCategory)}
              aria-current={!activeCategory && !unknownCategory ? "page" : undefined}
            >
              Tất cả
            </LinkComponent>
          </li>
          {categories.map((c) => (
            <li key={c.id} className="shrink-0">
              <LinkComponent
                href={categoryHref(c.slug)}
                className={chip(activeCategory?.id === c.id)}
                aria-current={activeCategory?.id === c.id ? "page" : undefined}
              >
                {c.name}
              </LinkComponent>
            </li>
          ))}
        </ul>
      </nav>

      {items.length === 0 ? (
        // UC01 – luồng thay thế 3a
        <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-background px-4 py-16 text-center shadow-card">
          <PackageOpen className="h-10 w-10 text-muted" strokeWidth={1.5} aria-hidden="true" />
          <h1 className="text-lg font-bold text-foreground">Chưa có sản phẩm nào</h1>
          <p className="text-sm text-muted">
            {unknownCategory
              ? "Ngành hàng này không tồn tại."
              : "Ngành hàng này hiện chưa có sản phẩm."}
          </p>
        </div>
      ) : (
        <ProductGrid title={activeCategory?.name ?? "Tất cả sản phẩm"} count={items.length}>
          {items.map((p, i) => (
            <ProductCard
              key={p.id}
              product={p}
              href={`/products/${p.id}`}
              LinkComponent={LinkComponent}
              priority={i < EAGER_IMAGE_COUNT}
              actions={<AddToCartButton productId={p.id} />}
            />
          ))}
        </ProductGrid>
      )}
    </div>
  );
}
