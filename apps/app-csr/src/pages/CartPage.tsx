import { CartPageView } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import { products } from "@repo/data";
import { RouterLink } from "../components/RouterLink";

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = selectCartTotal(items, products);

  return (
    <CartPageView
      items={items}
      products={products}
      total={total}
      onUpdateQuantity={updateQuantity}
      onRemove={removeItem}
      LinkComponent={RouterLink}
    />
  );
}