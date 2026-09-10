import type { CartItem, Product } from "@repo/types";

interface CartDrawerProps {
  items: CartItem[];
  products: Product[];
  total: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
  onClose: () => void;
}

export function CartDrawer({
  items,
  products,
  total,
  onUpdateQuantity,
  onRemove,
  onClose,
}: CartDrawerProps) {
  const productMap = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-background shadow-xl flex flex-col z-50">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <h2 className="font-semibold text-foreground">Giỏ hàng</h2>
        <button onClick={onClose} aria-label="Đóng" className="text-muted hover:text-foreground">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {items.length === 0 && <p className="text-sm text-muted">Giỏ hàng trống.</p>}
        {items.map((item) => {
          const product = productMap.get(item.productId);
          if (!product) return null;
          return (
            <div key={item.productId} className="flex gap-3">
              <img
                src={product.thumbUrl}
                alt={product.name}
                width={64}
                height={64}
                className="w-16 h-16 object-cover rounded bg-surface"
              />
              <div className="flex-1">
                <p className="text-sm font-medium line-clamp-1 text-foreground">{product.name}</p>
                <p className="text-sm text-muted">{product.price.toLocaleString("vi-VN")}₫</p>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity - 1)}
                    className="w-6 h-6 border border-border rounded text-foreground hover:bg-surface"
                  >
                    −
                  </button>
                  <span className="text-sm w-6 text-center text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => onUpdateQuantity(item.productId, item.quantity + 1)}
                    className="w-6 h-6 border border-border rounded text-foreground hover:bg-surface"
                  >
                    +
                  </button>
                  <button
                    onClick={() => onRemove(item.productId)}
                    className="text-xs text-red-600 ml-2 hover:text-red-700"
                  >
                    Xoá
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-4 border-t border-border">
        <div className="flex justify-between font-semibold text-foreground">
          <span>Tổng tiền</span>
          <span>{total.toLocaleString("vi-VN")}₫</span>
        </div>
      </div>
    </div>
  );
}
