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
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4 px-4 py-20 text-center">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-accent-light">
          <ShoppingCart className="h-10 w-10 text-accent" strokeWidth={1.5} />
        </div>
        <h1 className="text-xl font-bold text-foreground">
          Giỏ hàng của bạn đang trống
        </h1>
        <p className="text-sm text-muted">
          Hãy khám phá sản phẩm và thêm vào giỏ hàng để bắt đầu mua sắm.
        </p>
        <LinkComponent
          href="/"
          className="mt-2 inline-flex items-center justify-center rounded-xl bg-accent px-6 py-2.5 font-semibold text-white transition-colors hover:bg-accent-dark"
        >
          Tiếp tục mua sắm
        </LinkComponent>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground sm:text-2xl">
          Giỏ hàng
          <span className="ml-2 align-middle text-base font-normal text-muted">
            ({itemCount} sản phẩm)
          </span>
        </h1>

        <LinkComponent
          href="/"
          className="hidden items-center gap-1 text-sm font-medium text-accent transition-colors hover:text-accent-dark sm:flex"
        >
          <ArrowLeft className="h-4 w-4" />
          Tiếp tục mua sắm
        </LinkComponent>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <div className="flex flex-col gap-3 lg:col-span-2">
          {items.map((item) => {
            const product = productMap.get(item.productId);
            if (!product) return null;
            const lineTotal = product.price * item.quantity;

            return (
              <div
                key={item.productId}
                className="flex gap-3 rounded-card border border-border bg-background p-3 shadow-card sm:gap-4 sm:p-4"
              >
                <img
                  src={product.thumbUrl}
                  alt={product.name}
                  width={96}
                  height={96}
                  className="h-20 w-20 flex-shrink-0 rounded-xl bg-surface object-cover sm:h-24 sm:w-24"
                />

                <div className="flex min-w-0 flex-1 flex-col justify-between gap-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <LinkComponent
                        href={`/products/${product.id}`}
                        className="line-clamp-2 font-medium text-foreground transition-colors hover:text-accent"
                      >
                        {product.name}
                      </LinkComponent>
                      <p className="mt-1 text-sm text-muted">
                        {product.price.toLocaleString("vi-VN")}₫ / sản phẩm
                      </p>
                    </div>
                    <button
                      onClick={() => onRemove(item.productId)}
                      aria-label={`Xoá ${product.name} khỏi giỏ hàng`}
                      className="shrink-0 rounded-lg p-2 text-muted transition-colors hover:bg-surface hover:text-sale"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center overflow-hidden rounded-xl border border-border">
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity - 1)
                        }
                        aria-label="Giảm số lượng"
                        className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-surface"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-10 text-center text-sm font-semibold text-foreground">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          onUpdateQuantity(item.productId, item.quantity + 1)
                        }
                        aria-label="Tăng số lượng"
                        className="flex h-9 w-9 items-center justify-center text-foreground transition-colors hover:bg-surface"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="font-bold text-foreground">
                      {lineTotal.toLocaleString("vi-VN")}₫
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="lg:col-span-1">
          <div className="rounded-card border border-border bg-background p-5 shadow-card sm:p-6 lg:sticky lg:top-24">
            <h2 className="mb-4 text-lg font-bold text-foreground">
              Tóm tắt đơn hàng
            </h2>
            <div className="flex justify-between text-sm text-muted">
              <span>Tạm tính ({itemCount} sản phẩm)</span>
              <span className="font-medium text-foreground">
                {total.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <div className="my-4 border-t border-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-semibold text-foreground">Tổng cộng</span>
              <span className="text-2xl font-bold text-accent-dark">
                {total.toLocaleString("vi-VN")}₫
              </span>
            </div>
            <Button variant="primary" className="mt-6 w-full" disabled>
              Tiến hành thanh toán
            </Button>
            <p className="mt-3 text-center text-xs text-muted">
              Bản mô phỏng — không xử lý thanh toán thực tế.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
