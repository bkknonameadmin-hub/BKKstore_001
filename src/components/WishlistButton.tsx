"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useWishlist } from "@/store/wishlist";
import { toast } from "@/store/toast";

/**
 * 상품 상세 페이지의 큰 위시리스트 토글 버튼.
 * zustand 스토어와 연동되어 헤더 카운트/카드 하트 등과 즉시 동기화됨.
 */
export default function WishlistButton({
  productId,
  initialActive,
  signedIn,
}: {
  productId: string;
  initialActive: boolean;
  signedIn: boolean;
}) {
  const router = useRouter();
  const has = useWishlist((s) => s.ids.has(productId));
  const pending = useWishlist((s) => s.pending.has(productId));
  const initialized = useWishlist((s) => s.initialized);
  const init = useWishlist((s) => s.init);
  const toggle = useWishlist((s) => s.toggle);

  // 서버 props(initialActive)와 스토어 상태가 어긋날 수 있어 첫 마운트 시 보정
  useEffect(() => {
    if (!initialized && signedIn && initialActive) {
      // 스토어가 아직 init되지 않았다면 최소 이 상품은 활성으로 알림
      // WishlistInitializer 가 곧 전체 목록을 동기화함
      init([productId]);
    }
  }, [initialized, signedIn, initialActive, productId, init]);

  const handleClick = async () => {
    if (!signedIn) {
      toast.warning("로그인이 필요합니다.", { href: `/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`, hrefLabel: "로그인" });
      return;
    }
    if (pending) return;

    const r = await toggle(productId);
    if (!r.ok) { toast.error(r.error || "처리 실패"); return; }
    if (r.added) {
      toast.success("위시리스트에 추가했어요!", { href: "/mypage/wishlist", hrefLabel: "보기" });
    } else {
      toast.info("위시리스트에서 제거했어요.");
    }
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      title={has ? "위시리스트에서 제거" : "위시리스트에 추가"}
      aria-pressed={has}
      className={`w-10 h-10 rounded-full border flex items-center justify-center text-xl transition-all ${
        has
          ? "border-rose-300 bg-rose-50 text-rose-500 hover:scale-105"
          : "border-gray-300 text-gray-400 hover:border-rose-300 hover:text-rose-400 hover:scale-105"
      } ${pending ? "opacity-60" : ""}`}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill={has ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
