"use client";
import { useEffect, useState } from "react";
import { useCart } from "@/store/cart";

export default function CartBadge() {
  const count = useCart((s) => s.totalCount());
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || count === 0) return null;
  return (
    <span
      aria-label={`장바구니 ${count}개`}
      className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 inline-flex items-center justify-center rounded-full bg-accent-500 text-white text-[10px] font-bold leading-none ring-2 ring-white tabular-nums"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
