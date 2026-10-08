import { ShoppingCart } from "lucide-react";
import type { LinkComponentType } from "./types";

interface SiteHeaderProps {
  /** "T&Q Mart (CSR)" hoặc "T&Q Mart (SSR)" — chỉ khác nhau ở nhãn để phân biệt lúc test, không phải khác biệt nghiệp vụ */
  storeLabel: string;
  cartQuantity: number;
  /**
   * Mỗi app dùng 1 hệ thống routing khác nhau (react-router-dom vs next/link),
   * nên Link được "tiêm" từ ngoài vào — cùng 1 cách làm với `cartAction` trong
   * ProductDetailView — để phần markup/CSS ở đây luôn render giống hệt nhau
   * giữa CSR và SSR.
   */
  LinkComponent: LinkComponentType;
}

export function SiteHeader({
  storeLabel,
  cartQuantity,
  LinkComponent,
}: SiteHeaderProps) {
  // "T&Q Mart (CSR)" -> tên "T&Q Mart" + nhãn "CSR"
  const match = storeLabel.match(/^(.*?)\s*\((.+)\)$/);
  const brand = match ? match[1] : storeLabel;
  const tag = match ? match[2] : null;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <LinkComponent
          href="/"
          className="flex items-center gap-2.5 text-foreground"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-base font-bold text-white">
            T
          </span>
          <span className="text-lg font-bold tracking-tight">{brand}</span>
          {tag && (
            <span className="rounded-full bg-accent-light px-2 py-0.5 text-[11px] font-semibold text-accent-dark">
              {tag}
            </span>
          )}
        </LinkComponent>

        <LinkComponent
          href="/cart"
          className="relative flex items-center gap-2 rounded-xl border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface"
        >
          <ShoppingCart className="h-5 w-5" aria-hidden="true" />
          <span className="hidden sm:inline">Giỏ hàng</span>
          <span className="sr-only">{`, ${cartQuantity} sản phẩm`}</span>
          {cartQuantity > 0 && (
            <span
              aria-hidden="true"
              className="absolute -right-1.5 -top-1.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-sale px-1 text-[11px] font-bold text-white"
            >
              {cartQuantity > 99 ? "99+" : cartQuantity}
            </span>
          )}
        </LinkComponent>
      </div>
    </header>
  );
}
