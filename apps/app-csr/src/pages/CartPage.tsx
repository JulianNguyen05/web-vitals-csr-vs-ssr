import { useEffect, useMemo, useState } from "react";
import { CartPageView } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import { products, toCartCatalog } from "@repo/data";
import { RouterLink } from "../components/RouterLink";

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const [mounted, setMounted] = useState(false);
  // Cùng hàm rút gọn như bản SSR (app-ssr/src/app/cart/page.tsx) để logic hai bên giống nhau.
  const catalog = useMemo(() => toCartCatalog(products), []);

  // Cố ý giữ cổng "mounted" giống hệt bản SSR (cart-client.tsx) để luồng hiển thị hai bản như nhau.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => setMounted(true), []);

  const total = selectCartTotal(items, catalog);

  if (!mounted) return <div className="p-4">Đang tải giỏ hàng...</div>;

  return (
    <CartPageView
      items={items}
      products={catalog}
      total={total}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      LinkComponent={RouterLink}
    />
  );
}
