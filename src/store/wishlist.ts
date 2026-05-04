"use client";
import { create } from "zustand";

type State = {
  /** 위시한 productId 집합 (Set 사용 — O(1) 조회) */
  ids: Set<string>;
  /** 서버에서 초기 로드 완료 여부 */
  initialized: boolean;
  /** 백그라운드 동작 중 (낙관적 업데이트 보호) */
  pending: Set<string>;

  init: (ids: string[]) => void;
  reset: () => void;

  has: (productId: string) => boolean;
  count: () => number;

  /** 낙관적으로 추가 → 서버 호출 → 실패 시 롤백 */
  add: (productId: string) => Promise<{ ok: boolean; error?: string }>;
  /** 낙관적으로 제거 → 서버 호출 → 실패 시 롤백 */
  remove: (productId: string) => Promise<{ ok: boolean; error?: string }>;
  /** 토글 — 현재 상태에 따라 add 또는 remove */
  toggle: (productId: string) => Promise<{ ok: boolean; added: boolean; error?: string }>;
};

export const useWishlist = create<State>((set, get) => ({
  ids: new Set(),
  initialized: false,
  pending: new Set(),

  init: (ids) => set({ ids: new Set(ids), initialized: true }),
  reset: () => set({ ids: new Set(), initialized: false, pending: new Set() }),

  has: (productId) => get().ids.has(productId),
  count: () => get().ids.size,

  add: async (productId) => {
    const cur = get();
    if (cur.pending.has(productId)) return { ok: false, error: "처리 중" };
    if (cur.ids.has(productId)) return { ok: true };

    // 낙관적 추가
    const newIds = new Set(cur.ids); newIds.add(productId);
    const newPending = new Set(cur.pending); newPending.add(productId);
    set({ ids: newIds, pending: newPending });

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "추가 실패");
      return { ok: true };
    } catch (e: any) {
      // 롤백
      const rollback = new Set(get().ids); rollback.delete(productId);
      set({ ids: rollback });
      return { ok: false, error: e.message };
    } finally {
      const p = new Set(get().pending); p.delete(productId);
      set({ pending: p });
    }
  },

  remove: async (productId) => {
    const cur = get();
    if (cur.pending.has(productId)) return { ok: false, error: "처리 중" };
    if (!cur.ids.has(productId)) return { ok: true };

    // 낙관적 제거
    const newIds = new Set(cur.ids); newIds.delete(productId);
    const newPending = new Set(cur.pending); newPending.add(productId);
    set({ ids: newIds, pending: newPending });

    try {
      const res = await fetch(`/api/wishlist?productId=${encodeURIComponent(productId)}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "제거 실패");
      return { ok: true };
    } catch (e: any) {
      // 롤백
      const rollback = new Set(get().ids); rollback.add(productId);
      set({ ids: rollback });
      return { ok: false, error: e.message };
    } finally {
      const p = new Set(get().pending); p.delete(productId);
      set({ pending: p });
    }
  },

  toggle: async (productId) => {
    const has = get().ids.has(productId);
    const result = has ? await get().remove(productId) : await get().add(productId);
    return { ...result, added: !has };
  },
}));
