import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@repo/types";

/** Giới hạn số lượng mỗi dòng giỏ hàng (SRS: số nguyên dương ≥ 1). */
export const MIN_QUANTITY = 1;
export const MAX_QUANTITY = 99;
export const clampQuantity = (q: number) =>
  Math.min(MAX_QUANTITY, Math.max(MIN_QUANTITY, Math.floor(Number.isFinite(q) ? q : MIN_QUANTITY)));

interface CartState {
  items: CartItem[];
  addItem: (productId: string, quantity?: number) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  getTotalQuantity: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (productId, quantity = 1) => {
        set((state) => {
          const existing = state.items.find((i) => i.productId === productId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.productId === productId
                  ? { ...i, quantity: clampQuantity(i.quantity + quantity) }
                  : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              { productId, quantity: clampQuantity(quantity), addedAt: Date.now() },
            ],
          };
        });
      },

      // Không xoá sản phẩm khi số lượng về 0 — xoá chỉ qua removeItem (nút "Xoá sản phẩm", UC04-3a).
      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items: state.items.map((i) =>
            i.productId === productId ? { ...i, quantity: clampQuantity(quantity) } : i
          ),
        }));
      },

      removeItem: (productId) => {
        set((state) => ({
          items: state.items.filter((i) => i.productId !== productId),
        }));
      },

      clearCart: () => set({ items: [] }),

      getTotalQuantity: () =>
        get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: "tqmart-cart" }
  )
);

export function selectCartTotal(
  items: CartItem[],
  products: Pick<Product, "id" | "price">[],
): number {
  const priceMap = new Map(products.map((p) => [p.id, p.price]));
  return items.reduce((sum, item) => {
    const price = priceMap.get(item.productId) ?? 0;
    return sum + price * item.quantity;
  }, 0);
}
