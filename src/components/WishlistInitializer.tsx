"use client";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useWishlist } from "@/store/wishlist";

/**
 * 클라이언트 마운트 시 사용자의 위시리스트 ID 목록을 fetch 해서
 * zustand 스토어를 초기화한다. 비로그인 시 reset.
 *
 * 한 번 init되면 이후 변경은 add/remove API를 통해 낙관적 업데이트로 동기화됨.
 */
export default function WishlistInitializer() {
  const { data: session, status } = useSession();
  const init = useWishlist((s) => s.init);
  const reset = useWishlist((s) => s.reset);
  const initialized = useWishlist((s) => s.initialized);

  useEffect(() => {
    if (status === "loading") return;

    if (!session?.user) {
      reset();
      return;
    }

    if (initialized) return;

    fetch("/api/wishlist")
      .then((r) => r.ok ? r.json() : [])
      .then((items: { productId: string }[]) => {
        init(items.map((i) => i.productId));
      })
      .catch(() => init([]));
  }, [session, status, initialized, init, reset]);

  return null;
}
