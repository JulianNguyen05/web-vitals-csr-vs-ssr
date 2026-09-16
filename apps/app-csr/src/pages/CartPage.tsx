import productsData from "@repo/data/json/products-20.json";
import { CartPageView } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import type { Product } from "@repo/types";

const products = productsData as Product[];

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
    />
  );
}