import productsData from "@repo/data/json/products-20.json";
import { CartDrawer } from "@repo/ui";
import { useCartStore, selectCartTotal } from "@repo/cart-store";
import type { Product } from "@repo/types";

const products = productsData as Product[];

export function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const total = selectCartTotal(items, products);

  return (
    <div className="p-4">
      <CartDrawer
        items={items}
        products={products}
        total={total}
        onUpdateQuantity={updateQuantity}
        onRemove={removeItem}
        onClose={() => {}}
      />
    </div>
  );
}