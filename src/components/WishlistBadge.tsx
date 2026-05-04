"use client";
import { useWishlist } from "@/store/wishlist";

type Props = {
  /** "absolute" — 아이콘 우상단에 떠있는 배지 (Header 메인 영역용)
   *  "inline"   — 인라인 텍스트 옆 작은 숫자 (텍스트 메뉴 옆) */
  variant?: "absolute" | "inline";
};

export default function WishlistBadge({ variant = "absolute" }: Props) {
  const count = useWishlist((s) => s.ids.size);
  if (count === 0) return null;
  const label = count > 99 ? "99+" : count;

  if (variant === "inline") {
    return (
      <span className="ml-1 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none tabular-nums">
        {label}
      </span>
    );
  }
  return (
    <span
      aria-label={`위시리스트 ${count}개`}
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-rose-500 text-white text-[10px] font-bold leading-none ring-2 ring-white tabular-nums"
    >
      {label}
    </span>
  );
}
