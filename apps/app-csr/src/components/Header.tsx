import { useCartStore } from "@repo/cart-store";
import { SiteHeader } from "@repo/ui";
import { RouterLink } from "./RouterLink";
import { STORE_LABEL } from "../config";

/**
 * Header là component RIÊNG đọc số lượng giỏ hàng — giống app-ssr/src/app/nav.tsx.
 * Nếu đọc giỏ hàng ở App, mỗi lần "Thêm vào giỏ" sẽ render lại cả ứng dụng
 * (kể cả 2000 thẻ sản phẩm), làm INP của CSR chậm do cách viết code chứ không do kiến trúc.
 */
export function Header() {
  const totalQuantity = useCartStore((s) => s.getTotalQuantity());
  return <SiteHeader storeLabel={STORE_LABEL} cartQuantity={totalQuantity} LinkComponent={RouterLink} />;
}
