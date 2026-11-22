import { products, toCartCatalog } from "@repo/data";
import { CartClient } from "./cart-client";

export const dynamic = "force-dynamic";

/**
 * Server Component: chỉ gửi danh mục rút gọn (id, tên, giá, ảnh thumb) xuống trình duyệt,
 * thay vì để client component import nguyên file JSON (~3,5 MB ở ngưỡng 2000).
 * Giỏ hàng nằm ở localStorage nên server không biết trước cần sản phẩm nào.
 */
export default function CartPage() {
  return <CartClient catalog={toCartCatalog(products)} />;
}
