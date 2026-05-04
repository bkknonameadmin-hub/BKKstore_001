"use client";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useWishlist } from "@/store/wishlist";
import { toast } from "@/store/toast";

type Props = {
  productId: string;
  /** 카드 우상단에 절대 위치 vs 인라인 — 기본 absolute */
  variant?: "absolute" | "inline";
  /** 표시 사이즈 (px) — 기본 28 */
  size?: number;
};

export default function WishlistHeartButton({ productId, variant = "absolute", size = 28 }: Props) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const has = useWishlist((s) => s.ids.has(productId));
  const pending = useWishlist((s) => s.pending.has(productId));
  const toggle = useWishlist((s) => s.toggle);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (status !== "authenticated" || !session?.user) {
      toast.warning("로그인이 필요합니다.", { href: "/login", hrefLabel: "로그인" });
      return;
    }
    if (pending) return;

    const r = await toggle(productId);
    if (!r.ok) {
      toast.error(r.error || "처리 실패");
      return;
    }
    if (r.added) {
      toast.success("위시리스트에 추가했어요!", { href: "/mypage/wishlist", hrefLabel: "보기" });
    } else {
      toast.info("위시리스트에서 제거했어요.");
    }
    router.refresh();
  };

  const baseClass = variant === "absolute"
    ? "absolute top-2 right-2 z-10 rounded-full bg-white/90 backdrop-blur-sm shadow-sm hover:bg-white"
    : "inline-flex rounded-full bg-white border border-gray-200 hover:border-rose-300";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={has}
      aria-label={has ? "위시리스트에서 제거" : "위시리스트에 추가"}
      title={has ? "위시리스트에서 제거" : "위시리스트에 추가"}
      className={`${baseClass} flex items-center justify-center transition-all ${
        has ? "text-rose-500" : "text-gray-400 hover:text-rose-400"
      } ${pending ? "opacity-60" : "hover:scale-110"}`}
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill={has ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  );
}
