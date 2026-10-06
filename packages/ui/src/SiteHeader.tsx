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
  return (
    <header className="flex items-center justify-between bg-background shadow-sm rounded-card px-6 py-3 mt-4 mb-6">
      <LinkComponent
        href="/"
        className="flex items-center gap-2 font-semibold text-foreground"
      >
        <span className="w-6 h-6 rounded-md bg-accent text-white text-xs flex items-center justify-center">
          T
        </span>
        {storeLabel}
      </LinkComponent>
      <LinkComponent
        href="/cart"
        className="flex items-center gap-1.5 text-sm text-accent hover:text-accent-dark"
      >
        <ShoppingCart className="w-4 h-4" aria-hidden="true" />
        <span>{cartQuantity}</span>
      </LinkComponent>
    </header>
  );
}
