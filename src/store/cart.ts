"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartItem = {
  productId: string;
  variantId?: string | null;     // 옵션 식별자 (없으면 단일 상품)
  variantName?: string | null;   // 표시용 옵션명
  name: string;
  price: number;
  thumbnail?: string | null;
  quantity: number;
  stock: number;
};

const keyOf = (i: { productId: string; variantId?: string | null }) =>
  `${i.productId}::${i.variantId || ""}`;

type CartState = {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  totalCount: () => number;
  totalPrice: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          const k = keyOf(item);
          const found = s.items.find((i) => keyOf(i) === k);
          if (found) {
            return {
              items: s.items.map((i) =>
                keyOf(i) === k
                  ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock) }
                  : i
              ),
            };
          }
          return { items: [...s.items, item] };
        }),
      remove: (key) => set((s) => ({ items: s.items.filter((i) => keyOf(i) !== key) })),
      setQty: (key, qty) =>
        set((s) => ({
          items: s.items.map((i) =>
            keyOf(i) === key ? { ...i, quantity: Math.max(1, Math.min(qty, i.stock)) } : i
          ),
        })),
      clear: () => set({ items: [] }),
      totalCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
      totalPrice: () => get().items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    }),
    { name: "fishing-mall-cart-v2" }
  )
);

export const cartKeyOf = keyOf;
