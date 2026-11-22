// Logic trang danh mục (UC01) — viết 1 lần, dùng y hệt ở CSR (đọc URL ở trình duyệt)
// và SSR (đọc searchParams ở server). Trạng thái nằm trên URL: /?category=<slug>
// Trang danh mục luôn hiển thị TOÀN BỘ sản phẩm của ngưỡng (hoặc của ngành đang lọc),
// để khối lượng dữ liệu hiển thị thay đổi đúng theo ngưỡng 20/500/2000 (biến số của đề tài).
import type { Category, Product } from "@repo/types";

export interface Listing {
  /** Sản phẩm hiển thị trên trang. */
  items: Product[];
  /** Ngành hàng đang lọc (null = tất cả). */
  category: Category | null;
  /** slug ngành hàng trên URL nhưng không tồn tại. */
  unknownCategory: boolean;
}

/** href trang danh mục theo ngành — cùng 1 định dạng ở cả 2 app. */
export function categoryHref(slug: string | null): string {
  return slug ? `/?category=${encodeURIComponent(slug)}` : "/";
}

export function getListing(
  products: Product[],
  categories: Category[],
  categorySlug: string | null | undefined,
): Listing {
  const slug = categorySlug?.trim() || null;
  const category = slug ? (categories.find((c) => c.slug === slug) ?? null) : null;
  const unknownCategory = Boolean(slug && !category);
  const items = unknownCategory
    ? []
    : category
      ? products.filter((p) => p.categoryId === category.id)
      : products;
  return { items, category, unknownCategory };
}
