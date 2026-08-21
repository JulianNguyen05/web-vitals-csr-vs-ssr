import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, Product } from "@repo/types";

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
                  ? { ...i, quantity: i.quantity + quantity }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { productId, quantity, addedAt: Date.now() }],
          };
        });
      },

      updateQuantity: (productId, quantity) => {
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
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

export function selectCartTotal(items: CartItem[], products: Product[]): number {
  const priceMap = new Map(products.map((p) => [p.id, p.price]));
  return items.reduce((sum, item) => {
    const price = priceMap.get(item.productId) ?? 0;
    return sum + price * item.quantity;
  }, 0);
}