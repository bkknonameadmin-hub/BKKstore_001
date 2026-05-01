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
    {
      name: "fishing-mall-cart-v2",
      version: 2,
      // v1(옵션 미지원) → v2(옵션 지원) 마이그레이션
      migrate: (persisted: any, version) => {
        if (version < 2 && persisted?.state?.items) {
          const migrated = persisted.state.items.map((i: any) => ({
            ...i,
            variantId: i.variantId ?? null,
            variantName: i.variantName ?? null,
          }));
          return { ...persisted.state, items: migrated };
        }
        return persisted?.state || persisted;
      },
      // 첫 로드 시 v1 키 자동 제거 (안 그러면 영원히 남음)
      onRehydrateStorage: () => () => {
        if (typeof window !== "undefined") {
          try { window.localStorage.removeItem("fishing-mall-cart"); } catch {}
        }
      },
    }
  )
);

export const cartKeyOf = keyOf;
