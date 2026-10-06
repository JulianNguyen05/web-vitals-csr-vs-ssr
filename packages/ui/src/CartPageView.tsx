import type { CartItem, Product } from "@repo/types";
import { ArrowLeft, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "./Button";
import type { LinkComponentType } from "./types";

interface CartPageViewProps {
  items: CartItem[];
  products: Product[];
  total: number;
  LinkComponent: LinkComponentType;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemove: (productId: string) => void;
}

export function CartPageView({
  items,
  products,
  total,
  LinkComponent,
  onUpdateQuantity,
  onRemove,
}: CartPageViewProps) {
  const productMap = new Map(products.map((p) => [p.id, p]));
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-24 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-surface">
          <ShoppingCart className="h-9 w-9 text-muted" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-semibold text-foreground">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-sm text-muted">
          Hãy khám phá sản phẩm và thêm vào giỏ hàng để bắt đầu mua sắm.
        </p>
        <LinkComponent href="/">
          <Button variant="primary">Tiếp tục mua sắm</Button>
        </LinkComponent>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-foreground">
          Giỏ hàng
          <span className="ml-2 align-middle text-base font-normal text-muted">
            ({itemCount} sản phẩm)
          </span>
        </h1>

        <LinkComponent
          href="/"
          className="hidden items-center gap-1 text-sm text-accent hover:text-accent-dark sm:flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Tiếp tục mua sắm
        </LinkComponent>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          {items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) return null;
            const lineTotal = product.price * item.quantity;

            return (
              <div
                key={item.productId}
                className="flex gap-4 rounded-card border border-border bg-background p-4 shadow-sm"
              >
                <img
                  src={product.thumbUrl}
                  alt={product.name}
                  width={96}
                  height={96}
                  className="h-24 w-24 flex-shrink-0 rounded-lg bg-surface object-cover"
                />

                <div className="flex flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground line-clamp-2">
                        {product.name}
                      </p>
                      <p className="mt-1 text-sm text-muted">
                        {product.price.toLocaleString("vi-VN")}₫ / sản phẩm
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.productId)}
                      aria-label={`Xoá ${product.name} khỏi giỏ hàng`}
                      className="shrink-0 rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center rounded-md border border-border">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label="Giảm số lượng"
                        className="flex h-8 w-8 items-center justify-center text-foreground transition-colors hover:bg-surface"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-medium text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity + 1)
                        }
                        aria-label="Tăng số lượng"
                        className="flex h-8 w-8 items-center justify-center text-foreground"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-semibold text-foreground">
                      {lineTotal.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-card border border-border bg-background p-6 shadow-sm">
            <h2 className="mb-4 font-semibold text-foreground">
              Tóm tắt đơn hàng
            </h2>
            <div className="flex justify-between text-sm text-muted">
              <span>Tạm tính ({itemCount} sản phẩm)</span>
              <span className="text-foreground">
                {total.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <div className="my-4 border-t border-border" />
            <div className="flex justify-between text-base font-semibold text-foreground">
              <span>Tổng cộng</span>
              <span className="text-accent">
                {total.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <Button variant="primary" className="mt-6 w-full" disabled>
              Tiến hành thanh toán
            </Button>
            <p className="mt-2 text-center text-xs text-muted">
              Bản mô phỏng — không xử lý thanh toán thực tế.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
